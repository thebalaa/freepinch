# Testing TODOs for New Specifications

This document tracks testing tasks for examples and commands in the newly created specification documents.

**Created:** 2026-02-05
**Status:** Pending

---

## Overview

Three new specs were created with numerous examples, commands, and workflows that need validation on a real Ubuntu 24.04 VPS:

1. `specs/openclaw-architecture.md` - OpenClaw system architecture
2. `specs/testing-guide.md` - Testing and development guide
3. `specs/troubleshooting-guide.md` - Deployment troubleshooting

---

## OpenClaw Architecture Spec Testing

### Gateway API Commands

**Location:** `specs/openclaw-architecture.md` (Gateway Service Details)

- [ ] **Test `devices list` command**
  ```bash
  ssh root@<IP> "cd /home/roboclaw/docker && sudo -u roboclaw docker compose exec openclaw-gateway node dist/index.js devices list"
  ```
  - Verify JSON output format
  - Check when no devices are paired
  - Check with pending pairing requests

- [ ] **Test `devices approve` command**
  ```bash
  ssh root@<IP> "cd /home/roboclaw/docker && sudo -u roboclaw docker compose exec openclaw-gateway node dist/index.js devices approve <requestId>"
  ```
  - Verify approval succeeds
  - Check error handling for invalid requestId
  - Verify device appears in list after approval

- [ ] **Test health check endpoint**
  ```bash
  curl http://localhost:18789/health
  ```
  - Via SSH tunnel
  - Verify response format

### Configuration File Structure

**Location:** `specs/openclaw-architecture.md` (Configuration System)

- [ ] **Verify `~/.openclaw/openclaw.json` structure**
  ```bash
  ssh root@<IP> "cat /home/roboclaw/.openclaw/openclaw.json"
  ```
  - Document actual schema
  - Verify what's created during onboarding
  - Check if spec matches reality

### Volume Mounts

**Location:** `specs/openclaw-architecture.md` (Docker Containerization)

- [ ] **Verify volume mounts exist**
  ```bash
  ssh root@<IP> "ls -la /home/roboclaw/.openclaw"
  ssh root@<IP> "ls -la /home/roboclaw/.openclaw/workspace"
  ```
  - Check permissions (should be owned by UID 1000)
  - Verify persistence after container restart

---

## Testing Guide Spec Testing

### Development Environment Setup

**Location:** `specs/testing-guide.md` (Development Environment Setup)

- [ ] **Follow setup instructions from scratch**
  - Clone repository
  - Run `npm install`
  - Run `npm run build`
  - Verify `node dist/index.js --version` works
  - Document any missing steps

- [ ] **Test watch mode**
  ```bash
  npm run watch
  ```
  - Make a change to TypeScript source
  - Verify automatic recompilation
  - Check for any issues

### Test Server Setup

**Location:** `specs/testing-guide.md` (Test Server Setup)

- [ ] **Validate VPS provider recommendations**
  - Are providers still accurate? (DigitalOcean, Hetzner, Linode)
  - Are pricing estimates correct? ($5-10/month)
  - Do minimum specs still apply? (Ubuntu 24.04, 1GB RAM)

- [ ] **Test snapshot workflow**
  - Create snapshot after fresh Ubuntu install
  - Deploy clawctl
  - Test restore from snapshot
  - Verify quick reset capability

### Full Deployment Test

**Location:** `specs/testing-guide.md` (Testing Workflow > Full Deployment Test)

- [ ] **Follow step-by-step deployment test**
  - Build: `npm run build`
  - Deploy: `node dist/index.js deploy <IP> --key <path> --verbose`
  - Verify each phase completes successfully
  - Document actual output vs expected output
  - Note any discrepancies

### Testing Resume/Idempotency

**Location:** `specs/testing-guide.md` (Testing Resume/Idempotency)

- [ ] **Test resume after kill**
  - Start deployment
  - Kill at Phase 5
  - Check state file
  - Resume and verify it continues from Phase 6

- [ ] **Test idempotency (run twice)**
  - Complete full deployment
  - Run same command again
  - Verify no errors
  - Verify phases are skipped appropriately

### Testing Auto-Connect

**Location:** `specs/testing-guide.md` (Testing Specific Features > Testing Auto-Connect)

- [ ] **Test SSH tunnel creation**
  - Deploy with auto-connect
  - Verify tunnel spawns correctly
  - Check port forwarding (18789)
  - Test connection to localhost:18789

- [ ] **Test browser opening**
  - Test on Linux (xdg-open)
  - Test on macOS (open)
  - Test on WSL
  - Document any platform-specific issues

- [ ] **Test pairing detection**
  - Monitor pairing detection polling
  - Verify timeout after 60 seconds
  - Test auto-approval of pairing request

- [ ] **Test `--no-auto-connect` flag**
  ```bash
  node dist/index.js deploy <IP> --key <path> --no-auto-connect
  ```
  - Verify auto-connect is skipped
  - Verify deployment completes normally

### Testing Configuration

**Location:** `specs/testing-guide.md` (Testing Specific Features > Testing Configuration)

- [ ] **Test environment variables**
  ```bash
  export CLAWCTL_SSH_KEY=~/.ssh/test_key
  node dist/index.js deploy <IP>
  ```
  - Verify environment variables are read
  - Test precedence (flags > env > files)

- [ ] **Test config files**
  - Create `~/.clawctl/config.yml`
  - Test global config
  - Create `./clawctl.yml`
  - Test local config precedence

### Destructive Operations

**Location:** `specs/testing-guide.md` (Destructive Operations)

- [ ] **Test `--clean` flag**
  ```bash
  node dist/index.js deploy <IP> --key <path> --clean
  ```
  - Verify everything is removed
  - Document what gets deleted
  - Verify fresh deployment succeeds

- [ ] **Test `--force` flag**
  ```bash
  node dist/index.js deploy <IP> --key <path> --force
  ```
  - Deploy partially
  - Use --force to restart
  - Verify state is ignored
  - Verify deployment succeeds

### Platform-Specific Testing

**Location:** `specs/testing-guide.md` (Platform-Specific Testing)

- [ ] **Test on WSL**
  - SSH key permissions
  - Path handling
  - Browser opening
  - Document issues

- [ ] **Test on macOS**
  - SSH key permissions
  - Browser opening with `open`
  - Document issues

- [ ] **Test on native Linux**
  - Browser opening with `xdg-open`
  - Document issues

---

## Troubleshooting Guide Spec Testing

### Phase-by-Phase Verification

**Location:** `specs/troubleshooting-guide.md` (Phase 0-10 sections)

For each phase, verify:
- [ ] **Phase 0: Validation**
  - Trigger each error scenario listed
  - Verify error messages match spec
  - Test proposed solutions

- [ ] **Phase 1: SSH Connection**
  - Test "Connection refused" scenario
  - Test "Permission denied" scenario
  - Test diagnostic commands
  - Verify solutions work

- [ ] **Phase 2: Install Base Packages**
  - Simulate apt-get failures
  - Test recovery steps

- [ ] **Phase 3: Install Docker**
  - Test Docker installation failures
  - Verify diagnostic commands

- [ ] **Phase 4: Setup Deployment User**
  - Test "User already exists" scenario
  - Verify recovery steps

- [ ] **Phase 5: Create Directories**
  - Test permission failures
  - Test disk space issues

- [ ] **Phase 6: Build OpenClaw Image**
  - Test Git clone failures
  - Test Docker build failures
  - Verify error messages

- [ ] **Phase 7: Upload Docker Compose**
  - Test permission issues
  - Verify file upload errors

- [ ] **Phase 8: Onboarding**
  - Test onboarding failures
  - Test config file not created
  - Verify diagnostic steps

- [ ] **Phase 9: Gateway Startup**
  - Test container won't start
  - Test port conflicts
  - Verify log inspection commands

- [ ] **Phase 10: Auto-Connect**
  - Test SSH tunnel failures
  - Test browser opening failures
  - Verify fallback instructions

### General Troubleshooting Commands

**Location:** `specs/troubleshooting-guide.md` (General Troubleshooting Steps)

- [ ] **Verify all diagnostic commands work**
  ```bash
  # Check remote state
  ssh root@<IP> "cat /home/roboclaw/.clawctl-deploy-state.json"

  # Check Docker status
  ssh root@<IP> "docker ps"
  ssh root@<IP> "docker images"

  # Check user
  ssh root@<IP> "id roboclaw"

  # Check permissions
  ssh root@<IP> "ls -la /home/roboclaw"

  # Check logs
  ssh root@<IP> "cd /home/roboclaw/docker && docker compose logs"
  ```

### Recovery Strategies

**Location:** `specs/troubleshooting-guide.md` (Recovery Strategies)

- [ ] **Test manual cleanup procedure**
  ```bash
  # Follow all manual cleanup steps
  ssh root@<IP>
  cd /home/roboclaw/docker
  sudo -u roboclaw docker compose down
  # ... etc
  ```
  - Verify each step works
  - Document any missing steps

- [ ] **Test state file manipulation**
  - Edit state file manually
  - Verify deployment resumes correctly
  - Test edge cases

### Quick Diagnosis Table

**Location:** `specs/troubleshooting-guide.md` (Quick Diagnosis)

- [ ] **Verify all error messages in table exist in code**
  - Search codebase for each error string
  - Update spec if messages have changed
  - Add missing error messages

### Debugging Commands

**Location:** `specs/troubleshooting-guide.md` (Section 8: Debugging Advanced Issues)

- [ ] **Test container debugging commands**
  ```bash
  docker logs openclaw-gateway
  docker compose logs
  docker inspect openclaw-gateway
  netstat -tulpn | grep 18789
  ```
  - Verify all commands work
  - Check output matches expectations

- [ ] **Test onboarding debugging**
  ```bash
  docker ps | grep openclaw-cli
  docker logs openclaw-cli
  docker compose run --rm -it openclaw-cli onboard --no-install-daemon
  ```
  - Verify commands work
  - Document actual output

- [ ] **Test gateway debugging**
  ```bash
  curl http://localhost:18789/health
  docker logs openclaw-gateway --tail 50
  docker compose restart openclaw-gateway
  ```
  - Verify all commands work

---

## Documentation Accuracy

### Cross-Reference Verification

- [ ] **Verify cross-references between specs**
  - Check all links between specs work
  - Verify section references are accurate
  - Update broken links

- [ ] **Verify PRIMER.md routing**
  - Test that routing table correctly points to spec sections
  - Verify topic index entries are accurate

### Code Example Accuracy

- [ ] **Verify all code examples are valid**
  - Copy-paste each example
  - Run it
  - Verify it works as described
  - Update examples that don't work

### Command Verification

- [ ] **Test all bash commands in specs**
  - Every `bash` code block should be tested
  - Document which ones require specific prerequisites
  - Update commands that have changed

---

## Priority Testing Order

1. **High Priority** (Core functionality):
   - [ ] Full deployment test (testing-guide.md)
   - [ ] Resume/idempotency test (testing-guide.md)
   - [ ] Phase 1 SSH troubleshooting (troubleshooting-guide.md)
   - [ ] Gateway API commands (openclaw-architecture.md)

2. **Medium Priority** (Common scenarios):
   - [ ] Auto-connect testing (testing-guide.md)
   - [ ] Configuration testing (testing-guide.md)
   - [ ] Phase 3 Docker installation (troubleshooting-guide.md)
   - [ ] Phase 8 Onboarding (troubleshooting-guide.md)

3. **Low Priority** (Edge cases):
   - [ ] Platform-specific testing (testing-guide.md)
   - [ ] Manual cleanup procedures (troubleshooting-guide.md)
   - [ ] All phase error scenarios (troubleshooting-guide.md)

---

## Testing Environment

**Recommended Setup:**
- Fresh Ubuntu 24.04 VPS (Hetzner CPX11 or DigitalOcean Basic Droplet)
- Snapshot capability for quick reset
- SSH key access configured
- Local machine with clawctl built from source

**Cost Estimate:** $5-10/month for test VPS

---

## Issue Tracking

When you find issues during testing:

1. **Document the issue**
   - What command was run
   - Expected behavior (per spec)
   - Actual behavior
   - Error messages

2. **Update the spec**
   - Fix incorrect commands
   - Add missing steps
   - Update error messages
   - Add warnings where needed

3. **Update memory**
   - Add gotchas to `MEMORY.md`
   - Document workarounds

---

## Completion Checklist

Before considering testing complete:

- [ ] All high priority tests completed
- [ ] All code examples tested and verified
- [ ] All diagnostic commands tested
- [ ] Platform-specific issues documented
- [ ] Specs updated with corrections
- [ ] MEMORY.md updated with findings
- [ ] This TODO list updated with results

---

**Note:** This is a living document. As you complete testing tasks, check them off and add notes about what you found. Update the specs accordingly.
