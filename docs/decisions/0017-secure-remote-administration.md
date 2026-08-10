# ADR 0017 - Secure Remote Administration

## Status

Accepted

## Context

`gym-prod` is administered through a hardened OpenSSH service that permits only the
`admin-gym` account and requires the existing Ed25519 key. UFW permits that service only on
the two private home LAN paths, so the operator previously had no supported administrative
path while away from home.

The host already runs an outbound-only Cloudflare Tunnel for `app.gymtrack.ch`, and the
Cloudflare account already has an exact-owner Access policy. Publishing router port 22,
relaxing UFW, or adding a second VPN provider would expand the access surface unnecessarily.

## Decision

Reuse the existing `gym-prod` Cloudflare Tunnel for remote administration:

- publish `ssh.gymtrack.ch` to `ssh://localhost:22` through a separate tunnel route;
- protect that hostname with a separate self-hosted Access application named
  `Gym Tracker SSH`;
- reuse the existing exact-owner `Allow Jan only` policy with no Bypass or Service Auth
  policy;
- use the existing one-time-PIN login method, instant authentication, and a 12-hour Access
  session;
- keep browser-rendered SSH and Cloudflare One Client authentication disabled;
- use client-side `cloudflared` as the OpenSSH `ProxyCommand` on the administrator MacBook;
- retain the existing passphrase-protected Ed25519 identity and pinned host key;
- keep `gym-prod` and `gym-prod-wifi` unchanged as private-LAN recovery paths; and
- keep OpenSSH, UFW, the router, `authorized_keys`, application ingress, and monitoring
  bindings unchanged.

The MacBook alias is `gym-prod-remote`. It uses `ssh.gymtrack.ch`, the existing `admin-gym`
user and identity, strict host-key checking through the already pinned primary host-key alias,
and keepalive settings suitable for shell and tmux administration.

## Consequences

The operator can now use SSH, SCP/SFTP, tmux, and loopback-only port forwarding from outside
the home networks without a public SSH listener or router port forward. Cloudflare Access
records authentication decisions, while OpenSSH continues to own host authentication,
key-only user authentication, and command execution.

Remote administration now depends on Cloudflare, DNS, the owner-email login path, the
MacBook, and the existing SSH key. A Cloudflare or owner-identity outage removes the remote
path; private-LAN aliases and physical access remain the recovery paths. Revocation consists
of disabling or deleting the SSH Access application or tunnel route, revoking Access
sessions, and rotating the OpenSSH key if the MacBook or private key is compromised.
