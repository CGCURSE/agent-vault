//go:build !windows

package cmd

import "syscall"

func runChild(binary string, args []string, env []string) error {
	return syscall.Exec(binary, args, env)
}
