# Stage 1 Plan — Secure Single-User External Access and Black-Box Validation

**Project:** Gym Tracker  
**Target host:** `gym-prod`  
**Current LAN address:** `http://192.168.1.57/`  
**Document purpose:** Define the complete implementation and verification plan for Stage 1 only.  
**Stage 1 outcome:** Jan can use the production Gym Tracker through a normal HTTPS URL from outside the home network, while everyone else is blocked before reaching the application and new account creation is disabled at the application layer.

---

## 1. Executive summary

The current private production environment is operational but reachable only from the home LAN. Stage 1 adds a controlled internet entry path without turning the application into a general public service.

The intended request path is:

```text
Jan on mobile data or an external network
                ↓
        https://<APP_HOSTNAME>
                ↓
        Cloudflare Access
   exact email allowlist + one-time PIN
                ↓
        Cloudflare Tunnel
                ↓
      Caddy on gym-prod
                ↓
       Next.js web/BFF
                ↓
          Fastify API
                ↓
          PostgreSQL
```

Stage 1 deliberately uses two independent protection layers:

1. **Cloudflare Access protection**
   - Only the exact approved owner email may pass the internet-facing access barrier.
   - Anyone else is denied before the request reaches Gym Tracker.

2. **Application-level registration lock**
   - New account creation is disabled in the application and API.
   - Even if the external access configuration is accidentally weakened, the application must still reject account creation.

The existing internal architecture remains intact:

- Caddy remains the only application ingress.
- Next.js, Fastify, PostgreSQL, Grafana, Prometheus, Alertmanager, and exporters remain unavailable directly from the internet.
- Grafana remains SSH-tunnel-only.
- No router port forwarding is added.
- Existing LAN access remains available unless a later decision intentionally changes it.
- Deployment remains deliberate and tied to a clean Git commit.
- Monitoring, backups, restore capability, and secrets handling remain unchanged except where Stage 1 introduces additional configuration or checks.

---

## 2. Scope

### 2.1 Included

Stage 1 includes:

- choosing and preparing the production hostname;
- adding the domain to Cloudflare if it is not already managed there;
- creating a production Cloudflare Tunnel;
- installing and operating `cloudflared` persistently on `gym-prod`;
- routing the tunnel to the existing Caddy ingress;
- configuring Cloudflare Access for one exact owner email;
- using email one-time PIN authentication at the Cloudflare barrier;
- disabling all new account creation in the Gym Tracker backend;
- hiding or disabling registration in the frontend;
- making the application safe behind an HTTPS public hostname;
- deploying a clean, recorded Stage 1 application snapshot;
- testing unauthorized access and direct registration attempts;
- verifying automatic recovery after service and host restarts;
- completing one real external black-box workout;
- inspecting logs, monitoring, persistence, and backup results after that workout;
- documenting the final configuration and operator procedure.

### 2.2 Explicitly excluded

The following belong to the later private-beta stage and must not be implemented as part of Stage 1:

- beta invitation records;
- one-time Gym Tracker registration tokens;
- transactional invitation emails;
- email verification for beta accounts;
- password-reset email infrastructure, unless already required for the owner account;
- open or invite-only public registration;
- multiple external users;
- a beta administration dashboard;
- public Grafana or Prometheus access;
- direct router port forwarding;
- public SSH;
- a general public launch;
- automated CI/CD deployment;
- major feature development unrelated to Stage 1 reliability.

---

## 3. Starting state

Stage 1 begins from the following established state:

- `gym-prod` runs Ubuntu with the T2-compatible kernel.
- The application is available on the LAN at `http://192.168.1.57/`.
- Caddy, Next.js, Fastify, PostgreSQL, Prometheus, Grafana, Alertmanager, and exporters run in Docker.
- Caddy is the only LAN-facing application service.
- Internal service ports are not available from the LAN.
- Containers return automatically after reboot.
- Production data is persistent.
- Telegram firing and resolved alerts work.
- Encrypted off-machine backups and restore tests work.
- Grafana is accessible only through an SSH tunnel.
- Secrets are outside Git.
- Production deploys use deliberate manual operations.
- Production currently runs a recorded Git commit.
- A non-blocking `plymouth-quit-wait.service` issue remains, but it does not prevent application, Docker, monitoring, timers, or backups from operating.

Before Stage 1 execution begins, the actual current production commit and server status report must be reconfirmed because they may have changed after this document was written.

---

## 4. End state and acceptance definition

Stage 1 is complete only when all of the following are true:

### External reachability

- A stable hostname exists, for example:

  ```text
  https://app.<DOMAIN>
  ```

- It resolves correctly from outside the home network.
- HTTPS is valid.
- No browser certificate warning occurs.
- No inbound router port forwarding is required.
- The hostname reaches Caddy through Cloudflare Tunnel.

### Access restriction

- Cloudflare Access protects the entire application hostname.
- The Access policy allows only the exact approved owner email.
- One-time PIN is a required login method.
- Requests from unapproved emails are denied.
- No broad `Everyone`, all-email, email-domain, bypass, or accidental alternate-hostname route permits access.
- An unauthenticated user cannot reach the Gym Tracker login page or API through the public hostname.

### Application restriction

- New account creation is disabled server-side.
- The registration UI is hidden or replaced with an unavailable message.
- Direct calls to registration endpoints fail.
- An existing owner account can still log in normally.
- Anonymous users cannot create or modify application data.
- Internal authorization remains enforced normally.

### Service isolation

- PostgreSQL is not public.
- Fastify is not public directly.
- Next.js is not public directly.
- Grafana, Prometheus, Alertmanager, and exporters are not public.
- SSH is not exposed through the application hostname.
- Caddy remains the sole application ingress after the tunnel.

### Reliability

- `cloudflared` runs as a persistent service.
- It starts automatically after a server reboot.
- It reconnects after temporary network interruption.
- The application and tunnel return after a full host reboot.
- Existing LAN access still works, unless deliberately removed.
- Monitoring and backup timers continue to work.

### Black-box validation

- Jan completes a real workout through the external hostname while using mobile data or another non-home network.
- The test includes normal login, active workout persistence, set editing, temporary interruption, workout completion, history review, logout, and later login.
- No SSH, database inspection, or server-side correction is used during the actual workout.
- The completed workout remains correct afterward.
- Logs show no unexplained critical error.
- Monitoring remains healthy.
- A subsequent successful backup includes the updated production state.

---

## 5. Fixed architectural decisions

The following decisions define this plan.

### 5.1 Production access method

Use a **production Cloudflare Tunnel**, not a development Quick Tunnel.

The tunnel is a persistent named object. The `cloudflared` connector on `gym-prod` establishes outbound connections to Cloudflare. The plan does not open ports on the residential router.

### 5.2 Public hostname

Use a dedicated application hostname:

```text
<APP_HOSTNAME>
```

Recommended pattern:

```text
app.<DOMAIN>
```

Do not use the root domain unless there is a specific reason. A dedicated hostname is easier to protect, migrate, and later separate from documentation or other services.

### 5.3 Access identity

Use Cloudflare Access with:

```text
Action:  Allow
Include: <OWNER_EMAIL> exactly
Require: Login method = One-time PIN
```

Do not use:

```text
Include: Everyone
```

Do not use One-time PIN as the sole Include rule. That would allow any valid email address to authenticate.

### 5.4 Tunnel origin

The tunnel must forward traffic to the existing Caddy ingress, not directly to Next.js or Fastify.

Preferred origin target, subject to verification:

```text
http://127.0.0.1:80
```

If the current Docker publication does not permit loopback access, determine the smallest safe change that lets `cloudflared` reach Caddy while preserving the existing network boundary. Do not publish additional internal service ports.

### 5.5 Connector runtime

Run `cloudflared` as a host-level systemd service on Ubuntu.

This separates the tunnel connector lifecycle from bounded application restarts and allows it to return automatically at boot. The service credential or tunnel token must be stored outside Git and protected by root-readable permissions.

### 5.6 Registration control

Introduce or confirm one explicit production registration mode:

```env
REGISTRATION_MODE=DISABLED
```

The backend is authoritative. Hiding a registration button alone is insufficient.

### 5.7 Existing account

Stage 1 uses one already-created owner account. The test must use normal application authentication and authorization rather than a development bypass.

### 5.8 Monitoring interfaces

Grafana remains accessible only through:

```bash
ssh -L 3001:127.0.0.1:3001 gym-prod
```

No monitoring hostname is created for Stage 1.

---
# 6. Step by step plan
[Link to plan](stage-1-step-by-step-plan.md)
---

# 7. Rollback and emergency shutdown plan

Stage 1 must be easy to disable without affecting LAN production.

## Fastest public-access shutdown

If the public route is unsafe or malfunctioning, use one of these controlled actions:

1. Disable the Cloudflare Access application or public hostname.
2. Remove the public-hostname route from the tunnel.
3. Stop the connector:

   ```bash
   sudo systemctl stop cloudflared
   ```

These actions should make the external hostname unavailable while preserving LAN service.

## Application rollback

If the Stage 1 application release is defective:

1. record current evidence;
2. stop making simultaneous changes;
3. restore the previous known-good application commit/images;
4. handle database migration compatibility according to the deployment runbook;
5. keep registration disabled;
6. run LAN smoke tests;
7. re-enable external access only after verification.

## Credential compromise

If the tunnel token is exposed:

1. disable or rotate the connector credential in Cloudflare;
2. replace the server credential;
3. restart `cloudflared`;
4. inspect Cloudflare and server logs;
5. verify the repository and shared documents contain no remaining copy.

If a Cloudflare administrator account is compromised:

1. revoke active sessions;
2. reset credentials;
3. restore MFA;
4. audit tunnel, DNS, Access, and policy changes;
5. disable the public hostname until trust is restored.

---

# 8. Verification checklist

## Preflight

- [ ] Current production commit recorded.
- [ ] Current server status healthy.
- [ ] Owner login works on LAN.
- [ ] Recent backup is successful.
- [ ] Domain and hostname selected.
- [ ] Owner email selected.
- [ ] Rollback reference exists.

## Application

- [ ] `REGISTRATION_MODE=DISABLED` implemented.
- [ ] Backend registration route rejects requests.
- [ ] Alternate account-creation paths are closed.
- [ ] Registration UI is unavailable.
- [ ] Existing login still works.
- [ ] Production defaults fail closed.
- [ ] Relevant automated tests pass.
- [ ] Canonical external URL configured.
- [ ] Secure session cookie behaviour verified.
- [ ] Proxy, CORS, CSRF, host, and redirect behaviour reviewed.

## Cloudflare

- [ ] Domain is active in Cloudflare.
- [ ] Cloudflare administrator MFA is enabled.
- [ ] Production named tunnel exists.
- [ ] Public hostname points only to Caddy.
- [ ] No wildcard route exists.
- [ ] No bypass path exists.
- [ ] Tunnel credential is outside Git.
- [ ] `cloudflared` is active and enabled.
- [ ] Connector is healthy.

## Access

- [ ] Full application hostname is protected.
- [ ] Exact owner email is the Include rule.
- [ ] OTP is required.
- [ ] No `Everyone` rule exists.
- [ ] OTP is not used as an unrestricted Include rule.
- [ ] Unapproved email is denied.
- [ ] Owner email succeeds.
- [ ] API paths are protected.
- [ ] Alternate hostnames do not bypass Access.

## Deployment

- [ ] Release candidate is committed.
- [ ] Git working tree was clean.
- [ ] No secrets are in the diff.
- [ ] Deployed commit is recorded.
- [ ] Previous version remains available for rollback.
- [ ] Health checks pass.
- [ ] LAN access still works.
- [ ] Public owner access works.

## Isolation

- [ ] Fastify is not directly public.
- [ ] PostgreSQL is not public.
- [ ] Next.js is not directly public.
- [ ] Grafana is not public.
- [ ] Prometheus is not public.
- [ ] Alertmanager is not public.
- [ ] Exporters are not public.
- [ ] No router port forwarding was added.
- [ ] Anonymous state-changing requests fail.
- [ ] New account creation fails.

## Reliability

- [ ] Bounded app restart passes.
- [ ] `cloudflared` restart passes.
- [ ] Full host reboot passes.
- [ ] Tunnel returns automatically.
- [ ] Application returns automatically.
- [ ] Data persists.
- [ ] Monitoring remains healthy.
- [ ] Backup timers remain operational.

## Black-box test

- [ ] Test used mobile data or external network.
- [ ] Test started logged out.
- [ ] Cloudflare OTP worked.
- [ ] Gym Tracker login worked.
- [ ] Workout started.
- [ ] Exercises and sets were added.
- [ ] Earlier set was edited.
- [ ] Active workout resumed after interruption.
- [ ] Connectivity interruption was handled.
- [ ] Workout completed.
- [ ] History was correct.
- [ ] Logout and later login worked.
- [ ] No SSH or database intervention occurred during test.
- [ ] No duplicate or missing data occurred.

## Closeout

- [ ] Logs reviewed.
- [ ] Monitoring reviewed.
- [ ] No unexplained critical alert remains.
- [ ] Successful post-test backup confirmed.
- [ ] Operational status document updated.
- [ ] Rollback procedure documented.
- [ ] Critical and high defects closed.
- [ ] Final Stage 1 completion recorded.

---

# 9. Operator commands after Stage 1

## Normal health inspection

```bash
ssh gym-prod
/srv/gym-tracker/scripts/status.sh
```

## Recent application errors

```bash
/srv/gym-tracker/scripts/logs-errors.sh
```

## Tunnel status

```bash
sudo systemctl status cloudflared --no-pager
```

## Tunnel logs

```bash
sudo journalctl -u cloudflared --since "1 hour ago" --no-pager
```

## Restart only the tunnel connector

```bash
sudo systemctl restart cloudflared
```

## Bounded application restart

```bash
/srv/gym-tracker/scripts/restart.sh
```

## Backup status

```bash
sudo /srv/gym-tracker/scripts/backup-status.sh
```

## Immediate public shutdown

```bash
sudo systemctl stop cloudflared
```

Stopping `cloudflared` is an emergency external-access shutdown, not a normal application restart. It should leave the LAN application and internal Docker services available.

---

# 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Access policy accidentally allows all valid emails | Exact-email Include rule; OTP as Require; negative test with another email |
| Registration button hidden but API remains open | Backend-enforced `REGISTRATION_MODE=DISABLED`; direct API tests |
| Tunnel bypasses Caddy and exposes an internal service | Public hostname points only to verified Caddy origin |
| Tunnel credential enters Git | Store only in service secret/config; repository scan before commit |
| Application redirects to LAN IP | Canonical external URL tests and proxy-aware configuration |
| Session cookie fails behind HTTPS proxy | Explicit secure-cookie and forwarded-protocol testing |
| Arbitrary forwarded headers corrupt logs/security decisions | Trust only verified proxy context; review Caddy/application proxy settings |
| Alternate hostname bypasses Access | Enumerate and test all public routes; remove temporary hostnames |
| Public URL survives but app fails after reboot | Full reboot test covering Docker and `cloudflared` |
| MacBook backup unavailable after real test | Verify post-test backup and manually retry if required |
| Stage 1 changes damage LAN production | Preserve existing Caddy path; maintain fast tunnel shutdown and app rollback |
| Cloudflare account compromise | Strong password, administrator MFA, recovery methods, audit trail |
| Black-box test is unintentionally assisted by server access | No SSH or DB use during workout; investigate only afterward |

---

# 11. Stage 1 completion statement template

Use the following structure in the final server status report:

```text
Stage 1 — Secure Single-User External Access: COMPLETE

Production hostname:
https://<APP_HOSTNAME>

External access:
Cloudflare Tunnel routes the hostname to the existing Caddy ingress.
No router port forwarding is configured.

Access control:
Cloudflare Access permits only <OWNER_EMAIL> using one-time PIN authentication.
Negative tests with an unapproved email and unauthenticated API requests passed.

Application registration:
REGISTRATION_MODE=DISABLED is enforced by the backend.
Direct registration attempts fail and create no user records.

Deployed application snapshot:
<STAGE_1_COMMIT>

Isolation:
Fastify, PostgreSQL, Next.js, Grafana, Prometheus, Alertmanager, and exporters
remain unavailable directly from the internet.

Reliability:
cloudflared is enabled as a system service and returned successfully after
service restart and full host reboot.

Black-box validation:
A complete workout was performed over mobile data through the production
hostname without operational intervention. The workout persisted correctly,
history and later login were verified, logs were reviewed, and a subsequent
off-machine backup succeeded.

Known accepted issues:
<LIST_OR_NONE>
```

---

# 12. Official implementation references

These references should be checked again during implementation because vendor interfaces and documentation may change.

- Cloudflare Tunnel overview:  
  `https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/`

- Create a remotely managed tunnel:  
  `https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/`

- Run `cloudflared` as a Linux service:  
  `https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/as-a-service/linux/`

- Publish and protect a self-hosted application:  
  `https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/`

- Cloudflare Access policies and common misconfigurations:  
  `https://developers.cloudflare.com/cloudflare-one/access-controls/policies/`

- Common Access policy patterns, including OTP restrictions:  
  `https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/`

- Caddy reverse proxy documentation:  
  `https://caddyserver.com/docs/caddyfile/directives/reverse_proxy`

---

## Final intended result

After this plan is executed, the production Gym Tracker will still be a private, single-user system, but it will be usable through a normal HTTPS URL from outside the home.

The internet will be able to reach only the Cloudflare edge. Cloudflare Access will allow only the owner's exact email, the tunnel will forward accepted traffic to Caddy, and Gym Tracker itself will reject all account creation. The resulting environment will be suitable for one realistic external black-box workout before any private-beta invitation system is introduced.
