# ADR 0018 - Persistent Reverse Backup Tunnel

## Status

Accepted on 2026-08-19.

## Context

The encrypted Restic repository remains on the owner's MacBook behind the restricted
`gym-backup` SFTP account. The original server-initiated route to `MacBook-Jan.local` became
unreliable because the production host could neither resolve nor route to that name across the
current nested home-network topology. This caused required backup and maintenance runs to fail
even while the MacBook was awake.

A manually started reverse SSH tunnel proved that the MacBook can initiate the reviewed
Cloudflare Access SSH connection to `gym-prod` and expose its own SSH service only on production
loopback. A manual terminal process is not an operationally durable dependency.

## Decision

- Run the reverse tunnel as the owner's per-user macOS `launchd` agent.
- Bind the remote forwarding endpoint only to `127.0.0.1:2222` on `gym-prod` and forward it to
  MacBook loopback port 22.
- Keep the existing `gym-prod-remote` Cloudflare Access SSH alias, administrator key and host-key
  verification for the outer tunnel.
- Point Restic's production SFTP alias at `127.0.0.1:2222`, while continuing to authenticate the
  separate restricted `gym-backup` account with its dedicated key and pinned Mac host key.
- Require SSH keepalives, batch mode and `ExitOnForwardFailure`; let `launchd` restart failed
  connections with a 60-second throttle.
- Do not introduce a non-interactive Cloudflare service token. The owner must renew an expired
  Access grant interactively, after which `launchd` reconnects automatically.

## Consequences

Ordinary tunnel exits, Wi-Fi changes and Mac wake cycles recover without leaving a terminal open.
Neither the Mac SSH service nor port 2222 becomes publicly reachable, and the encrypted repository
and restricted-SFTP controls are unchanged.

Backups still fail while the MacBook is asleep, shut down or offline. An expired Cloudflare Access
grant still needs owner interaction, and repeated daily backup attempts plus staleness alerts remain
necessary. A compromised production host retains the previously accepted ability to alter its
writable Restic repository. An always-on second Mac mini or immutable object storage remains the
preferred future availability improvement.
