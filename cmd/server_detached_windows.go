//go:build windows

package cmd

import "os/exec"

func configureDetachedChild(_ *exec.Cmd) {}
