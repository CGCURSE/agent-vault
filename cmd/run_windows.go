//go:build windows

package cmd

import (
	"os"
	"os/exec"
)

func runChild(binary string, args []string, env []string) error {
	cmd := exec.Command(binary, args[1:]...)
	cmd.Env = env
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
