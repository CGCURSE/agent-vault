//go:build !windows

package store

import "syscall"

func restrictFileCreation() int {
	return syscall.Umask(0077)
}

func restoreFileCreation(previous int) {
	syscall.Umask(previous)
}
