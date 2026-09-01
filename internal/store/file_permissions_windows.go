//go:build windows

package store

func restrictFileCreation() int {
	return 0
}

func restoreFileCreation(_ int) {}
