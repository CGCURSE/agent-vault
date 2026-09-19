import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useRouteContext } from "@tanstack/react-router";
import type { AuthContext, VaultContext } from "../router";
import Navbar from "./Navbar";
import Sheet from "./Sheet";

// Source of truth for vault tab ids: the union and active-tab lookup derive
// from it. An id must equal its route path segment. New tab = entry here plus
// a NavItem.
const VAULT_TABS = [
  "services",
  "credentials",
  "proposals",
  "skills",
  "logs",
  "users",
  "agents",
  "tokens",
  "settings",
] as const;

type VaultTab = (typeof VAULT_TABS)[number];

interface NavItem {
  id: VaultTab;
  label: string;
  icon: ReactNode;
  badge?: number;
}

export default function VaultLayout() {
  const { auth } = useRouteContext({ from: "/_auth" }) as { auth: AuthContext };
  const vaultContext = useRouteContext({ from: "/_auth/vaults/$name" }) as VaultContext;
  const location = useLocation();
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [discoveredCount, setDiscoveredCount] = useState(0);

  // The Members section (Users / Agents / Tokens) is only meaningful at
  // vault `member` or higher: a `proxy`-role caller can only proxy
  // requests through Agent Vault — they have no read or mutation rights
  // on the people/agents/tokens lists, and the underlying GET endpoints
  // require `member`+ anyway.
  const showMembersNav = vaultContext.vault_role !== "proxy";

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const resp = await fetch(
          `/v1/admin/proposals?vault=${encodeURIComponent(vaultContext.vault_name)}&status=pending`
        );
        if (resp.ok) {
          const data = await resp.json();
          setPendingCount((data.proposals ?? []).length);
        }
      } catch {
        // ignore
      }
    }
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30_000);
    return () => clearInterval(interval);
  }, [vaultContext.vault_name]);

  useEffect(() => {
    if (vaultContext.vault_role === "proxy") return;
    async function fetchDiscoveredCount() {
      try {
        const resp = await fetch(
          `/v1/vaults/${encodeURIComponent(vaultContext.vault_name)}/discovered-hosts?limit=0`
        );
        if (resp.ok) {
          const data = await resp.json();
          setDiscoveredCount(data.total ?? 0);
        }
      } catch {
        // ignore
      }
    }
    fetchDiscoveredCount();
    const interval = setInterval(fetchDiscoveredCount, 30_000);
    return () => clearInterval(interval);
  }, [vaultContext.vault_name, vaultContext.vault_role]);

  // Derive active tab from current URL path
  const pathSegments = location.pathname.split("/");
  const lastSegment = pathSegments[pathSegments.length - 1] as VaultTab;
  const activeTab: VaultTab = (VAULT_TABS as readonly string[]).includes(lastSegment)
    ? lastSegment
    : "services";

  // Any route change closes the mobile drawer (drawer links to a new path
  // land here; same-path clicks close via onNavigate instead).
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // A drawer hidden by the desktop breakpoint must also release its focus
  // trap and body scroll lock when the viewport grows past that breakpoint.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    function handleDesktopChange(event: MediaQueryListEvent) {
      if (event.matches) setIsDrawerOpen(false);
    }
    desktop.addEventListener("change", handleDesktopChange);
    return () => desktop.removeEventListener("change", handleDesktopChange);
  }, []);

  const mainNav: NavItem[] = [
    {
      id: "services",
      label: "Services",
      badge: discoveredCount > 0 ? discoveredCount : undefined,
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      id: "credentials",
      label: "Credentials",
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      id: "proposals",
      label: "Proposals",
      badge: pendingCount > 0 ? pendingCount : undefined,
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: "skills",
      label: "Skills",
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
    {
      id: "logs",
      label: "Logs",
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
          <line x1="10" y1="9" x2="12" y2="9" />
        </svg>
      ),
    },
  ];

  const memberNav: NavItem[] = [
    {
      id: "users",
      label: "Users",
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      id: "agents",
      label: "Agents",
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="14" x2="23" y2="14" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="14" x2="4" y2="14" />
        </svg>
      ),
    },
    {
      id: "tokens",
      label: "Tokens",
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="15" r="4" />
          <path d="M10.85 12.15L19 4" />
          <path d="M18 5l2 2" />
          <path d="M15 8l3 3" />
        </svg>
      ),
    },
  ];

  const settingsNav: NavItem = {
    id: "settings",
    label: "Settings",
    icon: (
      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  };

  function closeDrawer() {
    setIsDrawerOpen(false);
  }

  // Sidebar: play the exit animation, then navigate to the vaults list.
  function handleSidebarAllVaults(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (isExiting) return;
    setIsExiting(true);
    const aside = sidebarRef.current;
    if (aside) {
      aside.addEventListener("animationend", (e) => { if (e.target === aside) navigate({ to: "/vaults" }); }, { once: true });
    } else {
      navigate({ to: "/vaults" });
    }
  }

  // Drawer: navigate immediately; the route change closes the drawer.
  function handleDrawerAllVaults(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    closeDrawer();
    navigate({ to: "/vaults" });
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-bg">
      <Navbar
        email={auth.email}
        vaultName={vaultContext.vault_name}
        isOwner={auth.is_owner}
        onOpenNavigation={() => setIsDrawerOpen(true)}
      />
      <div className="flex flex-1">
        {/* Sidebar (lg and up) */}
        <aside
          ref={sidebarRef}
          className={`hidden lg:flex w-[220px] flex-shrink-0 border-r border-border bg-surface flex-col ${isExiting ? "animate-sidebar-out" : "animate-sidebar-in"}`}
        >
          <VaultNavigation
            vaultName={vaultContext.vault_name}
            activeTab={activeTab}
            mainNav={mainNav}
            memberNav={memberNav}
            settingsNav={settingsNav}
            showMembersNav={showMembersNav}
            onAllVaults={handleSidebarAllVaults}
          />
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 flex justify-center">
          <Outlet />
        </main>
      </div>

      {/* Navigation drawer (below lg) */}
      <div className="lg:hidden">
        <Sheet
          open={isDrawerOpen}
          onClose={closeDrawer}
          side="left"
          eyebrow="Vault"
          title={vaultContext.vault_name}
          widthClass="max-w-[320px]"
        >
          <div className="-mx-6 -my-5">
            <VaultNavigation
              vaultName={vaultContext.vault_name}
              activeTab={activeTab}
              mainNav={mainNav}
              memberNav={memberNav}
              settingsNav={settingsNav}
              showMembersNav={showMembersNav}
              onAllVaults={handleDrawerAllVaults}
              onNavigate={closeDrawer}
            />
          </div>
        </Sheet>
      </div>
    </div>
  );
}

// Single navigation renderer and item source shared by the desktop sidebar
// and the mobile drawer. Route definitions live only in SidebarItem.
function VaultNavigation({
  vaultName,
  activeTab,
  mainNav,
  memberNav,
  settingsNav,
  showMembersNav,
  onAllVaults,
  onNavigate,
}: {
  vaultName: string;
  activeTab: VaultTab;
  mainNav: NavItem[];
  memberNav: NavItem[];
  settingsNav: NavItem;
  showMembersNav: boolean;
  onAllVaults: (e: MouseEvent<HTMLAnchorElement>) => void;
  /** Host hook run after a navigation click (the drawer closes itself). */
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="px-4 pt-5 pb-3">
        <a
          href="/"
          onClick={onAllVaults}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All vaults
        </a>
      </div>

      <nav className="flex-1 px-3 pb-4 flex flex-col" aria-label="Vault sections">
        <ul className="space-y-0.5">
          {mainNav.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              active={activeTab === item.id}
              vaultName={vaultName}
              onActivate={onNavigate}
            />
          ))}
        </ul>

        {showMembersNav && (
          <>
            <div className="mt-6 mb-2 px-3">
              <span className="text-[11px] font-semibold text-text-dim uppercase tracking-wider">
                Members
              </span>
            </div>
            <ul className="space-y-0.5">
              {memberNav.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  active={activeTab === item.id}
                  vaultName={vaultName}
                  onActivate={onNavigate}
                />
              ))}
            </ul>
          </>
        )}

        <div className="mt-auto pt-4">
          <ul className="space-y-0.5">
            <SidebarItem
              item={settingsNav}
              active={activeTab === "settings"}
              vaultName={vaultName}
              onActivate={onNavigate}
            />
          </ul>
        </div>
      </nav>
    </>
  );
}

function SidebarItem({
  item,
  active,
  vaultName,
  onActivate,
}: {
  item: NavItem;
  active: boolean;
  vaultName: string;
  onActivate?: () => void;
}) {
  const tabPath = `/vaults/${encodeURIComponent(vaultName)}/${item.id}`;
  return (
    <li>
      <Link
        to={tabPath}
        onClick={onActivate}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors no-underline ${
          active
            ? "bg-bg/50 text-text font-semibold"
            : "text-text-muted hover:bg-bg/50 hover:text-text"
        }`}
      >
        <span className={active ? "text-text" : "text-text-dim"}>{item.icon}</span>
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge !== undefined && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold bg-warning-bg text-warning border border-warning/20">
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}
