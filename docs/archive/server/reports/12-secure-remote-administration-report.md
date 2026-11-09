# Stage 12 Secure Remote Administration Report

- **Target:** `gym-prod`
- **Execution date:** 2026-08-08 CEST
- **Execution boundary:** Cloudflare Access SSH route, administrator MacBook client, and
  focused verification only

## Executive summary

Secure remote administration is operational. `ssh.gymtrack.ch` reaches the existing
OpenSSH service through the existing outbound-only `gym-prod` Cloudflare Tunnel. A separate
`Gym Tracker SSH` Access application permits only the existing exact-owner policy, uses the
one-time-PIN identity provider and a 12-hour session, and has browser rendering and
Cloudflare One Client authentication disabled.

The MacBook uses a new `gym-prod-remote` alias with client-side `cloudflared`, the established
Ed25519 identity, strict host-key checking against the already pinned host key, and SSH
keepalives. The Ethernet and Wi-Fi aliases were not changed.

An outside-network test passed from a phone hotspot: the remote alias reached
`admin-gym@gym-prod`, both home-LAN aliases were unreachable, direct TCP port 22 on the public
hostname was blocked, and the existing application hostname continued to reach Cloudflare
Access. Cloudflare's Access authentication log recorded one allowed login to the SSH
application and no blocked login in the inspected 12-hour window.

## Configuration applied

### Cloudflare

Created a self-hosted Access application with:

```text
Name:               Gym Tracker SSH
Destination:        ssh.gymtrack.ch
Policy:             Allow Jan only
Identity provider:  one-time PIN
Instant auth:       enabled
Session duration:   12 hours
Browser rendering:  disabled
One Client auth:    disabled
```

Added one route to the existing `gym-prod` tunnel:

```text
ssh.gymtrack.ch -> ssh://localhost:22
```

The existing `app.gymtrack.ch` route and catch-all rule remained present and unchanged. No
account ID, tunnel ID, connector token, Access token, owner email, public IP, or OTP is
recorded here.

### Administrator MacBook

Installed Homebrew `cloudflared` `2026.7.3` and added:

```sshconfig
Host gym-prod-remote
    HostName ssh.gymtrack.ch
    User admin-gym
    IdentityFile ~/.ssh/gym_prod_ed25519
    IdentitiesOnly yes
    AddKeysToAgent yes
    UseKeychain yes
    ProxyCommand /opt/homebrew/bin/cloudflared access ssh --hostname %h
    HostKeyAlias 192.168.1.57
    StrictHostKeyChecking yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

The local SSH config retained mode `0600`. `ssh -G` validated all three aliases, and the two
LAN aliases retained their original destinations and identity.

### Server and network boundary

No OpenSSH, UFW, router, `authorized_keys`, Caddy, application, database, monitoring, Docker,
or DNS-origin listener configuration was changed on `gym-prod`. The route connects from the
already running local `cloudflared` service to `localhost:22`; it does not require an inbound
router or UFW rule.

## Verification results

| Check | Result |
|---|---|
| Both LAN aliases worked before the change | Passed |
| Remote alias presented the pinned host key | Passed |
| Remote identity was `admin-gym@gym-prod` | Passed |
| Linux sudo still required interactive authentication | Passed |
| SCP transfer and SHA-256 comparison | Passed |
| Temporary SCP test file removed | Passed |
| tmux attach, detach, fresh-SSH persistence, and cleanup | Passed |
| Grafana tunnel to `127.0.0.1:3001` | HTTP 200 |
| Outside-network remote SSH | Passed |
| Both private LAN aliases from the outside network | Unreachable as intended |
| Direct public-hostname TCP port 22 | Blocked |
| Existing application hostname from outside | Cloudflare Access redirect retained |
| SSH and `cloudflared` services | Active and enabled |
| Listener set | Existing SSH, private HTTP, and loopback Grafana listeners retained |
| Access authentication log | One allowed SSH-app login observed; no blocked login observed |

Two failed backup units were present before and after this work because the off-machine
MacBook backup destination had been unavailable. They are a pre-existing backup-operations
issue and were not changed or repaired in this access stage.

The operator performed the privileged service/firewall/container verification in a visible
terminal. The Codex desktop terminal handoff did not attach to that terminal and returned no
capturable output, so this report does not treat that output as independently captured
evidence. Fresh remote SSH, service state, listener state, and the external negative tests
were independently rechecked afterward.

## Recovery and revocation

- If Cloudflare is unavailable, use `gym-prod` or `gym-prod-wifi` from the private LAN, or use
  physical access.
- To disable remote administration immediately, disable the `Gym Tracker SSH` Access
  application or remove the `ssh.gymtrack.ch` tunnel route.
- Revoke active Cloudflare Access sessions when the MacBook or owner identity may be
  compromised.
- Remove the corresponding public key from `authorized_keys` and install a replacement key
  if the private SSH key may be compromised.
- Removing the route or Access application does not affect either LAN alias.

## Remaining boundaries

- The remote path depends on Cloudflare, DNS, the email one-time-PIN path, and the
  administrator MacBook.
- This setup uses traditional OpenSSH through Access, not Cloudflare Access for Infrastructure
  or browser-rendered SSH; Cloudflare records authentication decisions but is not configured
  for SSH command logging.
- Public uptime monitoring remains separate work.
