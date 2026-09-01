//go:build !windows

package cmd

import (
	"os/exec"
	"syscall"
)

func configureDetachedChild(child *exec.Cmd) {
	child.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
}
