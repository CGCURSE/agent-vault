package mitm

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Infisical/agent-vault/internal/brokercore"
	"github.com/Infisical/agent-vault/internal/crypto"
	"github.com/Infisical/agent-vault/internal/oauth"
	"github.com/Infisical/agent-vault/internal/store"
)

type refreshStore struct {
	mu         sync.Mutex
	credential store.Credential
	config     store.CredentialOAuth
	services   string
	noMetadata bool
}

func (s *refreshStore) GetBrokerConfig(context.Context, string) (*store.BrokerConfig, error) {
	return &store.BrokerConfig{ServicesJSON: s.services}, nil
}
func (s *refreshStore) UnmatchedHostPolicy(context.Context, string) (brokercore.UnmatchedHostPolicy, error) {
	return brokercore.PolicyDeny, nil
}
func (s *refreshStore) GetCredential(context.Context, string, string) (*store.Credential, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.credential
	return &c, nil
}
func (s *refreshStore) GetCredentialOAuth(context.Context, string, string) (*store.CredentialOAuth, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.noMetadata {
		return nil, sql.ErrNoRows
	}
	c := s.config
	return &c, nil
}
func (s *refreshStore) UpdateCredentialOAuthError(context.Context, string, string, string) error {
	return nil
}
func (s *refreshStore) UpdateCredentialOAuthTokens(_ context.Context, _, _ string, ct, nonce, rt, rn []byte, expiry *time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.credential.Ciphertext = ct
	s.credential.Nonce = nonce
	s.config.TokenExpiresAt = expiry
	if len(rt) > 0 {
		s.config.RefreshTokenCT = rt
		s.config.RefreshTokenNonce = rn
	}
	return nil
}

func TestForwardOAuthUnauthorizedRecovery(t *testing.T) {
	for _, tc := range []struct {
		name, kind, method                                                                           string
		noExpiry, refreshFails, alwaysReject, body, noMetadata, noRefresh, concurrent, substitutions bool
		wantStatus, wantCalls, wantRefresh                                                           int
	}{
		{name: "valid local expiry", kind: "oauth", method: "GET", wantStatus: 200, wantCalls: 2, wantRefresh: 1},
		{name: "unknown local expiry", kind: "oauth", method: "HEAD", noExpiry: true, wantStatus: 200, wantCalls: 2, wantRefresh: 1},
		{name: "missing metadata", kind: "oauth", method: "GET", noMetadata: true, wantStatus: 401, wantCalls: 1},
		{name: "missing refresh token", kind: "oauth", method: "GET", noRefresh: true, wantStatus: 401, wantCalls: 1},
		{name: "late concurrent rejection", kind: "oauth", method: "GET", concurrent: true, wantStatus: 200, wantCalls: 4, wantRefresh: 1},
		{name: "substitution cannot replay", kind: "oauth", method: "GET", substitutions: true, wantStatus: 401, wantCalls: 1},
		{name: "static credential", kind: "static", method: "GET", wantStatus: 401, wantCalls: 1},
		{name: "unsafe method", kind: "oauth", method: "POST", wantStatus: 401, wantCalls: 1},
		{name: "GET body cannot replay", kind: "oauth", method: "GET", body: true, wantStatus: 401, wantCalls: 1},
		{name: "one retry only", kind: "oauth", method: "GET", alwaysReject: true, wantStatus: 401, wantCalls: 2, wantRefresh: 1},
		{name: "failed refresh preserves rejection", kind: "oauth", method: "GET", refreshFails: true, wantStatus: 401, wantCalls: 1, wantRefresh: 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var calls, refreshes, staleCalls atomic.Int32
			bothStale := make(chan struct{})
			accepted := make(chan struct{})
			var acceptedOnce, bothStaleOnce sync.Once
			tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				refreshes.Add(1)
				if tc.refreshFails {
					http.Error(w, "rejected", 400)
					return
				}
				r.Body = http.MaxBytesReader(w, r.Body, 4096)
				if err := r.ParseForm(); err != nil {
					t.Error(err)
				}
				if r.Form.Get("refresh_token") != "refresh-old" {
					t.Error("unexpected refresh token")
				}
				w.Header().Set("Content-Type", "application/json")
				_, _ = io.WriteString(w, `{"access_token":"accepted","refresh_token":"refresh-new","token_type":"Bearer","expires_in":3600}`)
			}))
			defer tokenServer.Close()
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				if tc.concurrent && r.Header.Get("Authorization") == "Bearer rejected" {
					if staleCalls.Add(1) == 1 {
						select {
						case <-bothStale:
						case <-time.After(3 * time.Second):
							http.Error(w, "concurrent request missing", http.StatusGatewayTimeout)
							return
						}
					} else {
						bothStaleOnce.Do(func() { close(bothStale) })
						select {
						case <-accepted:
						case <-time.After(3 * time.Second):
							http.Error(w, "refresh did not recover", http.StatusGatewayTimeout)
							return
						}
					}
				}
				if r.Header.Get("Authorization") != "Bearer accepted" || tc.alwaysReject {
					http.Error(w, "provider rejection", http.StatusUnauthorized)
					return
				}
				if tc.concurrent {
					acceptedOnce.Do(func() { close(accepted) })
				}
				_, _ = io.WriteString(w, "read succeeded")
			}))
			defer upstream.Close()
			host, _, _ := net.SplitHostPort(strings.TrimPrefix(upstream.URL, "http://"))
			key := make([]byte, 32)
			ct, nonce, err := crypto.Encrypt([]byte("rejected"), key)
			if err != nil {
				t.Fatal(err)
			}
			rt, rn, err := crypto.Encrypt([]byte("refresh-old"), key)
			if err != nil {
				t.Fatal(err)
			}
			expiry := time.Now().Add(time.Hour)
			s := &refreshStore{credential: store.Credential{Type: tc.kind, Ciphertext: ct, Nonce: nonce}, config: store.CredentialOAuth{TokenURL: tokenServer.URL, ClientID: "test-client", RefreshTokenCT: rt, RefreshTokenNonce: rn, TokenExpiresAt: &expiry}, services: fmt.Sprintf(`[{"name":"read","host":%q,"auth":{"type":"bearer","token":"READ"}}]`, host)}
			if tc.substitutions {
				s.services = fmt.Sprintf(`[{"name":"read","host":%q,"auth":{"type":"bearer","token":"READ"},"substitutions":[{"key":"READ","placeholder":"__token__","in":["query"]}]}]`, host)
			}
			s.noMetadata = tc.noMetadata
			if tc.noRefresh {
				s.config.RefreshTokenCT = nil
			}
			if tc.noExpiry {
				s.config.TokenExpiresAt = nil
			}
			cp := brokercore.NewStoreCredentialProvider(s, key)
			cp.OAuthStore = s
			cp.Refresher = oauth.NewRefresher()
			sr := validTokenResolver("test-session", &brokercore.ProxyScope{VaultID: "v1", VaultName: "test", VaultRole: "proxy"})
			proxyURL, roots, _ := setupProxy(t, sr, cp)
			client := newTrustingClient(proxyURL, url.User("test-session"), roots)
			request := func() {
				var body io.Reader
				if tc.body {
					body = strings.NewReader("must not disappear")
				}
				req, err := http.NewRequest(tc.method, upstream.URL+"/read?token=__token__", body)
				if err != nil {
					t.Error(err)
					return
				}
				resp, err := client.Do(req)
				if err != nil {
					t.Error(err)
					return
				}
				content, err := io.ReadAll(resp.Body)
				_ = resp.Body.Close()
				if err != nil {
					t.Error(err)
					return
				}
				if resp.StatusCode != tc.wantStatus {
					t.Errorf("status %d, want %d", resp.StatusCode, tc.wantStatus)
				}
				if tc.method != "HEAD" && tc.wantStatus == 401 && !strings.Contains(string(content), "provider rejection") {
					t.Error("lost provider rejection body")
				}
			}
			if tc.concurrent {
				var wg sync.WaitGroup
				wg.Add(2)
				for range 2 {
					go func() { defer wg.Done(); request() }()
				}
				wg.Wait()
			} else {
				request()
			}
			if got := int(calls.Load()); got != tc.wantCalls {
				t.Errorf("provider calls %d, want %d", got, tc.wantCalls)
			}
			if got := int(refreshes.Load()); got != tc.wantRefresh {
				t.Errorf("refresh calls %d, want %d", got, tc.wantRefresh)
			}
		})
	}
}
