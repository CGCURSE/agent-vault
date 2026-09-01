//go:build !windows

package pidfile

import (
	"errors"
	"syscall"
)

func isRunning(pid int) bool {
	err := syscall.Kill(pid, 0)
	return err == nil || errors.Is(err, syscall.EPERM)
}
