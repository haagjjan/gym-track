# 6. Step-by-step implementation plan
---

## Step 1 — Stage 1 preflight and change control

### Goal

Confirm the starting state, freeze the intended architecture, collect required values, and establish a safe rollback point before changing production.

### Required inputs

Record these values in a secure working note:

```text
<DOMAIN>
<APP_HOSTNAME>
<OWNER_EMAIL>
<CLOUDFLARE_ACCOUNT>
<CURRENT_PRODUCTION_COMMIT>
<CURRENT_CADDY_ORIGIN>
<CURRENT_REGISTRATION_BEHAVIOUR>
<CURRENT_PUBLIC_BASE_URL_CONFIGURATION>
```

Do not store credentials or tunnel tokens in this planning document.

### Work

1. Run the normal status inspection:

   ```bash
   ssh gym-prod
   /srv/gym-tracker/scripts/status.sh
   ```

2. Record:
   - deployed commit;
   - container status;
   - published ports;
   - Caddy container and image;
   - Next.js and API images;
   - current health status.

3. Check recent errors:

   ```bash
   /srv/gym-tracker/scripts/logs-errors.sh
   ```

4. Confirm backup health:

   ```bash
   sudo /srv/gym-tracker/scripts/backup-status.sh
   ```

5. Confirm that the MacBook repository:
   - is on the intended branch;
   - has a known working baseline;
   - has no accidental secrets;
   - has a safety branch or tag before Stage 1 development.

6. Decide the Stage 1 production hostname.

7. Confirm that the chosen domain can be managed through Cloudflare:
   - already active in Cloudflare; or
   - ready for nameserver migration.

8. Confirm the exact owner email that will be allowed through Cloudflare Access.

9. Capture the current Caddy configuration and deployment configuration before modifying either.

10. Confirm that the existing owner account works on the LAN before any changes.

### Deliverables

- recorded current production commit;
- recorded current server status;
- chosen domain and application hostname;
- chosen exact owner email;
- configuration backup or Git-tracked baseline;
- rollback reference.

### Verification

- All current containers are healthy or any known exception is documented.
- The current app works over LAN.
- The owner can log in.
- Recent backup status is acceptable.
- No Stage 1 change has yet altered production.
- A known rollback point exists.

### Stop conditions

Do not proceed if:

- the latest backup is missing or untrusted;
- the current production state is already unstable;
- the owner account cannot log in;
- the exact deployed commit cannot be identified;
- the domain ownership or Cloudflare account is uncertain;
- the repository contains unresolved secret exposure.

---

## Step 2 — Implement authoritative registration disablement

### Goal

Ensure that nobody can create an account during Stage 1, regardless of the frontend or Cloudflare configuration.

### Required behaviour

When:

```env
REGISTRATION_MODE=DISABLED
```

the system must behave as follows:

- registration page is unavailable or clearly disabled;
- registration navigation is hidden;
- registration API returns an intentional denial;
- invitation-based account creation is not active;
- normal login for existing accounts remains available;
- no database user record is created by a rejected request.

### Work

1. Inspect every account-creation path:
   - normal registration route;
   - API registration endpoint;
   - server actions;
   - BFF proxy routes;
   - social login callback that might auto-create users;
   - test or development seed endpoint;
   - administrator-created public endpoint;
   - any “first user” bootstrap behaviour.

2. Add one shared registration-mode configuration with strict validation.

3. Make the backend reject registration before:
   - password hashing;
   - email side effects;
   - user insert;
   - session creation.

4. Return a predictable status and response, such as:

   ```text
   HTTP 403
   Registration is currently disabled.
   ```

   The exact API contract should follow the repository's existing error conventions.

5. Ensure the frontend:
   - does not show a usable sign-up form;
   - does not present misleading “create account” calls to action;
   - gives a concise private-access message if someone reaches a registration route internally.

6. Ensure configuration defaults safely:
   - production must not accidentally become open if the variable is missing;
   - an unrecognized registration mode must fail validation or default closed;
   - tests must prove the fail-closed behaviour.

7. Add automated tests:
   - disabled registration rejects valid registration input;
   - disabled registration rejects malformed and valid attempts consistently;
   - no user is written;
   - existing login still works;
   - frontend route does not expose a functional registration form.

8. Add the configuration key to:
   - example environment documentation without secrets;
   - production deployment configuration;
   - validation schema;
   - operational documentation.

### Security requirements

- Do not implement this only as a frontend feature flag.
- Do not use an obscure URL as the protection.
- Do not rely on the Cloudflare owner-email rule as the only registration protection.
- Do not log submitted passwords or registration payloads.
- Do not leave alternate legacy endpoints active.

### Deliverables

- registration-mode implementation;
- backend enforcement;
- frontend disabled state;
- automated tests;
- production configuration documentation.

### Verification

Locally or in a controlled non-production environment:

1. Set:

   ```env
   REGISTRATION_MODE=DISABLED
   ```

2. Attempt registration through the user interface.

3. Attempt direct API registration with a valid payload.

4. Attempt account creation through every alternate path found during inspection.

5. Verify:
   - every attempt fails;
   - no user row appears;
   - no session is created;
   - login for an existing account succeeds.

### Completion criteria

- Account creation is impossible through supported and legacy public paths.
- The protection is enforced by the backend.
- Tests pass.
- The implementation is ready to be included in the Stage 1 release candidate.

---

## Step 3 — Prepare the application for a canonical external HTTPS URL

### Goal

Ensure that the application behaves correctly when accessed through an HTTPS hostname and one additional reverse-proxy layer.

### Why this step is necessary

The current LAN address uses plain HTTP and a private IP. An external hostname changes:

- scheme from `http` to `https`;
- host from `192.168.1.57` to `<APP_HOSTNAME>`;
- proxy chain;
- client address forwarding;
- secure cookie behaviour;
- origin and CORS checks;
- absolute redirects and callback URLs;
- potential caching and security headers.

### Work

1. Identify every configuration field related to:
   - public application URL;
   - API base URL;
   - authentication callback URL;
   - cookie domain;
   - cookie `Secure` setting;
   - trusted hostnames;
   - trusted proxies;
   - CORS origins;
   - CSRF origin checking;
   - redirect allowlists;
   - WebSocket origin, if used;
   - generated absolute links.

2. Establish one canonical external URL:

   ```text
   https://<APP_HOSTNAME>
   ```

3. Keep server-to-server traffic internal:
   - Next.js/BFF to Fastify should continue using the internal Docker network.
   - The browser should not need direct Fastify access.
   - Do not create a public API hostname unless the current architecture requires it.

4. Configure production cookies appropriately:
   - `Secure` for public HTTPS traffic;
   - `HttpOnly` where the browser does not need JavaScript access;
   - appropriate `SameSite`;
   - correct host/domain scoping;
   - suitable expiration.

5. Confirm proxy awareness:
   - application-generated redirects retain `https`;
   - the application does not redirect externally back to the LAN IP;
   - forwarded protocol and host are interpreted only from trusted proxy context;
   - client IP logging does not blindly trust arbitrary user-supplied forwarding headers.

6. Review Caddy handling of forwarded headers.
   - Preserve original host where required.
   - Determine whether trusted-proxy configuration is needed for correct client IP parsing.
   - Do not trust every network source merely to make logs convenient.

7. Review security headers:
   - HSTS should be enabled only when the HTTPS hostname is confirmed stable;
   - clickjacking protection;
   - MIME sniffing protection;
   - referrer policy;
   - content security policy if already supported.

8. Review CORS:
   - allow only the required origin;
   - do not use unrestricted wildcard CORS with credentials;
   - confirm the BFF architecture avoids unnecessary browser-to-API cross-origin traffic.

9. Ensure production error pages do not reveal:
   - stack traces;
   - filesystem paths;
   - internal hostnames;
   - database details;
   - secrets.

10. Add or update tests for:
    - secure cookie generation;
    - correct external redirects;
    - accepted and rejected origins;
    - host-header behaviour;
    - login behind a trusted proxy.

### Deliverables

- canonical URL configuration;
- secure-cookie configuration;
- proxy and origin review;
- updated tests;
- documented environment variables.

### Verification

In a local or controlled proxy simulation:

- login response creates expected cookie attributes;
- logout clears the correct cookie;
- redirects use `https://<APP_HOSTNAME>`;
- no redirect points to `192.168.1.57`;
- normal application API calls work through the BFF;
- unauthorized direct calls still fail;
- CORS does not accept arbitrary credentialed origins.

### Stop conditions

Do not expose the hostname until:

- login and session handling work under HTTPS assumptions;
- the application has no hard-coded LAN URL;
- callback and redirect configuration is understood;
- a safe trusted-proxy approach is defined.

---

## Step 4 — Prepare the Cloudflare domain and Zero Trust account

### Goal

Create the external control plane required for the production hostname, tunnel, and owner-only Access policy.

### Work

1. Add or confirm `<DOMAIN>` as an active Cloudflare zone.

2. If migrating nameservers:
   - record the current DNS records first;
   - reproduce required records in Cloudflare;
   - change registrar nameservers;
   - wait until Cloudflare marks the zone active;
   - verify unrelated domain services still work.

3. Enable or open the Cloudflare Zero Trust organization for the account.

4. Confirm that email one-time PIN is available as an identity provider/login method.

5. Choose clear names:

   ```text
   Tunnel: gym-prod
   Access application: Gym Tracker Stage 1
   Public hostname: <APP_HOSTNAME>
   Access policy: Allow Jan only
   ```

6. Confirm account ownership and recovery:
   - account uses a protected password;
   - multi-factor authentication is enabled for the Cloudflare administrator account;
   - recovery methods are stored safely;
   - no shared credentials are placed in the repository.

### Deliverables

- active Cloudflare zone;
- Zero Trust organization;
- OTP login method available;
- named configuration conventions;
- protected administrator account.

### Verification

- Cloudflare reports the zone as active.
- Existing DNS services still resolve.
- Zero Trust dashboard is accessible.
- One-time PIN is available as a login method.
- No public application hostname has yet been left unprotected.

### Stop conditions

Do not proceed if:

- moving nameservers would break existing mail or web records;
- the account has no reliable recovery method;
- administrator MFA is not configured;
- the chosen domain is not under the intended owner's control.

---

## Step 5 — Create the production Cloudflare Tunnel and public hostname

### Goal

Create the Cloudflare-side tunnel object and route `<APP_HOSTNAME>` to the Caddy origin.

### Work

1. Create a named, remotely managed tunnel for `gym-prod`.

2. Add a public hostname:

   ```text
   Hostname: <APP_HOSTNAME>
   Service:  http://<VERIFIED_CADDY_ORIGIN>
   ```

3. Use the verified Caddy origin. The expected preferred target is:

   ```text
   http://127.0.0.1:80
   ```

   Do not assume this target works until Step 6 confirms it from the host.

4. Do not point the public hostname directly to:
   - the Next.js container;
   - the Fastify container;
   - PostgreSQL;
   - Grafana;
   - Prometheus;
   - Alertmanager;
   - an exporter.

5. Do not create broad wildcard hostnames.

6. Do not create public bypass paths.

7. Obtain the connector installation command or token securely.

8. Treat the tunnel token as a secret:
   - do not paste it into Git-tracked documentation;
   - do not include it in screenshots shared publicly;
   - do not leave it in shell history where avoidable;
   - rotate it if exposed.

### Deliverables

- named production tunnel;
- one application public hostname;
- Caddy origin mapping;
- protected connector credential.

### Verification

From Cloudflare:

- the tunnel object exists;
- the public hostname is associated with the intended tunnel;
- there are no unintended wildcard routes;
- the service target is Caddy;
- no alternate hostname reaches the same origin without Access protection.

At this point the connector may still be offline. The public hostname must not be treated as complete until Access is configured and negative tests pass.

---

## Step 6 — Install and operate `cloudflared` on `gym-prod`

### Goal

Run the tunnel connector reliably on the Ubuntu host, with automatic restart and protected credentials.

### Work

1. SSH into the server:

   ```bash
   ssh gym-prod
   ```

2. Install `cloudflared` from Cloudflare's supported Linux installation method.

3. Verify the installed binary:

   ```bash
   cloudflared --version
   ```

4. Before installing the service, verify that the host can reach Caddy:

   ```bash
   curl -I http://127.0.0.1:80/
   ```

   If this fails:
   - inspect Docker port publication;
   - identify the current Caddy listener;
   - select the smallest safe host-reachable origin;
   - do not expose Next.js or Fastify directly.

5. Install the tunnel connector as a systemd service using the securely obtained credential.

6. Verify service ownership and permissions.

7. Ensure the credential/configuration is:
   - outside the repository;
   - readable only by the required service/root context;
   - included in the appropriate protected recovery documentation if necessary;
   - not copied into ordinary logs.

8. Start and enable the service.

9. Inspect status:

   ```bash
   sudo systemctl status cloudflared --no-pager
   ```

10. Inspect logs:

    ```bash
    sudo journalctl -u cloudflared --since "15 minutes ago" --no-pager
    ```

11. Confirm that the tunnel shows healthy connectors in Cloudflare.

12. Add `cloudflared` to the operator status documentation and, where appropriate, the server status script.

13. Decide whether the service needs explicit resource or restart controls beyond its installer defaults.

### Deliverables

- installed `cloudflared`;
- enabled systemd service;
- protected connector credential;
- healthy Cloudflare connector;
- documented operator commands.

### Verification

Run:

```bash
systemctl is-enabled cloudflared
systemctl is-active cloudflared
```

Expected:

```text
enabled
active
```

Also verify:

- Cloudflare shows the connector as healthy;
- Caddy remains available on LAN;
- Docker containers were not unnecessarily changed;
- no new external router port exists;
- no internal container port was published.

### Recovery test

Restart only the tunnel service:

```bash
sudo systemctl restart cloudflared
```

Confirm:

- it returns to active;
- the connector becomes healthy again;
- the public hostname returns once access policy is in place.

### Stop conditions

Do not continue if:

- `cloudflared` requires direct access to an internal service other than Caddy;
- its secret has been committed or exposed;
- the service does not reliably reconnect;
- LAN service breaks;
- unexpected ports appear.

---

## Step 7 — Configure Cloudflare Access for the exact owner email

### Goal

Ensure that only the approved owner can cross the public edge and reach Gym Tracker.

### Required policy

Configure one self-hosted Access application covering the full application hostname:

```text
Application hostname: <APP_HOSTNAME>
Action:               Allow
Include:              Email = <OWNER_EMAIL>
Require:              Login method = One-time PIN
```

All other users remain denied by default.

### Work

1. Create a Cloudflare Access self-hosted application for `<APP_HOSTNAME>`.

2. Cover the full hostname, not only the homepage path.

3. Set a reasonable Stage 1 session duration.
   - It should be long enough for normal workout use.
   - It should still require periodic reauthentication.
   - Record the chosen value.

4. Enable the one-time PIN identity provider for the application.

5. Add the Allow policy for the exact owner email.

6. Add One-time PIN as a Require rule where supported by the selected configuration.

7. Confirm there are no:
   - `Everyone` Include rules;
   - `Login Methods: One-time PIN` Include rules;
   - broad email-domain rules;
   - Bypass policies;
   - Service Auth policies not required by Stage 1;
   - wildcard applications that override the intended restriction.

8. Confirm policy ordering cannot allow traffic before the owner-only rule is evaluated.

9. Configure the Access application experience only as needed. Avoid unnecessary custom complexity.

10. Record:
    - Access application name;
    - protected hostname;
    - policy name;
    - approved email;
    - session duration;
    - identity method.

### Deliverables

- protected self-hosted application;
- exact-email allow policy;
- OTP requirement;
- documented session duration;
- no public bypass.

### Verification

Test in this order.

#### Test A — unauthenticated request

From an external network:

```bash
curl -I https://<APP_HOSTNAME>/
```

Expected:
- Cloudflare Access response or redirect;
- not the Gym Tracker page directly.

#### Test B — unapproved email

Using a private browser window:

1. Open the hostname.
2. enter a different email address;
3. attempt to request a code.

Expected:
- access is denied;
- the application is not reached;
- no Gym Tracker page or API data is returned.

#### Test C — approved email

1. Open the hostname.
2. enter `<OWNER_EMAIL>`;
3. receive the OTP;
4. authenticate;
5. reach the Gym Tracker login screen.

#### Test D — API paths

Without an Access session, try known application paths:

```text
/
<LOGIN_PATH>
<REGISTRATION_PATH>
<API_BASE_PATH>
```

Expected:
- every path remains behind Access;
- no path reaches the application anonymously.

#### Test E — alternate hostname

Test:
- the exact application hostname;
- the root domain;
- `www`;
- any previous tunnel hostname;
- direct Cloudflare tunnel preview hostnames, if any;
- home public IP if known.

Expected:
- no alternate public path reaches the application.

### Completion criteria

The owner can authenticate through Access. Everyone else is denied before reaching Gym Tracker.

---

## Step 8 — Build and deploy the Stage 1 release candidate

### Goal

Deploy one clean, reproducible application version containing the registration lock and public-URL readiness changes.

### Work

1. Complete all application changes from Steps 2 and 3.

2. Run the repository's full relevant validation suite:
   - formatting;
   - linting;
   - type checking;
   - unit tests;
   - integration tests;
   - production build;
   - migration validation;
   - selected end-to-end tests.

3. Confirm the Git working tree is clean.

4. Review the diff for:
   - accidental secrets;
   - tunnel credentials;
   - owner email hard-coded in source;
   - domain-specific values that should be configuration;
   - debug endpoints;
   - temporary bypasses;
   - disabled tests.

5. Create a Stage 1 commit.

6. Optionally create a clear release tag, for example:

   ```text
   v0.1.0-external-owner-test
   ```

7. Confirm the most recent successful production backup before deployment.

8. Deploy the exact commit through the existing deliberate production procedure.

9. Apply versioned database migrations only if Stage 1 requires them.

10. Record:
    - previous commit;
    - new commit;
    - image identifiers;
    - migration state;
    - deployment start and completion;
    - operator.

11. Run health checks.

12. Run an immediate LAN smoke test.

13. Run an immediate external owner-access smoke test.

### Deployment order

A safe order is:

```text
Confirm backup
      ↓
Deploy application configuration and code
      ↓
Apply required migration
      ↓
Start API and web
      ↓
Confirm Caddy
      ↓
Confirm Cloudflare Tunnel
      ↓
Confirm Access barrier
      ↓
Run smoke tests
```

The actual order must remain compatible with the repository's deployment scripts and migration strategy.

### Rollback readiness

Before deployment, determine:

- exact previous application commit;
- previous container images;
- whether any migration is backward-compatible;
- command or runbook to restore the previous app version;
- how to disable the public hostname immediately if necessary.

### Verification

Run:

```bash
/srv/gym-tracker/scripts/status.sh
/srv/gym-tracker/scripts/logs-errors.sh
```

Confirm:

- expected commit is reported;
- containers are healthy;
- registration mode is disabled;
- LAN login works;
- external Access login works;
- no internal ports changed;
- no new unexpected alert fires.

### Stop conditions

Rollback or disable the external hostname if:

- sessions fail;
- registration remains possible;
- redirects loop;
- the application exposes stack traces;
- CORS or CSRF protection blocks valid use or allows arbitrary origins;
- internal services become public;
- the deployed version cannot be identified;
- data integrity becomes uncertain.

---

## Step 9 — Perform security and isolation verification

### Goal

Prove that the public URL does not provide meaningful access to anyone except the owner and does not expose internal services.

### Test matrix

| Test | Expected result |
|---|---|
| Approved email + valid OTP | Reaches Gym Tracker login |
| Unapproved email | Denied before app |
| No Access session | Cannot reach app or API |
| Direct registration request after Access | Rejected by app |
| Anonymous state-changing request | Rejected |
| Direct Fastify access from internet | Unreachable |
| Direct PostgreSQL access from internet | Unreachable |
| Grafana from internet | Unreachable |
| Prometheus from internet | Unreachable |
| Alertmanager from internet | Unreachable |
| Exporter ports from internet | Unreachable |
| Home public IP on common app ports | No Gym Tracker exposure |
| Alternate hostname | No unprotected path |
| Existing LAN URL | Still behaves as intended |

### Work

1. Test from mobile data.

2. Test from a second external network if possible.

3. Test with:
   - normal browser;
   - private browser;
   - `curl`;
   - a different email address.

4. Attempt direct account creation after owner authentication:
   - UI route;
   - BFF route;
   - Fastify route through the app hostname;
   - legacy path if one exists.

5. Confirm no new user appears.

6. Review Caddy logs, application logs, and Cloudflare Access logs for:
   - correct denial;
   - no sensitive token logging;
   - accurate request host;
   - reasonable client address handling;
   - no application response for blocked requests.

7. Confirm that Access tokens or OTP values do not appear in application logs.

8. Perform a basic external port exposure check using a trusted method.
   - Do not rely only on the home network because NAT hairpin behaviour may differ.
   - Confirm that no router forwarding was accidentally enabled.

9. Confirm the public hostname is proxied only through Cloudflare.

### Verification record

Capture:

- test date and time;
- source network;
- browser/device;
- approved email result;
- unapproved email result;
- registration endpoint result;
- service exposure result;
- relevant log references;
- any exception.

Do not store OTP values, session cookies, Access JWTs, or tunnel tokens in the report.

### Completion criteria

- Only the owner can pass Cloudflare Access.
- Even the owner cannot create a new account.
- Anonymous users cannot create or modify data.
- Only Caddy is used as the application ingress.
- No internal or operational service is public.

---

## Step 10 — Verify service recovery and operational behaviour

### Goal

Prove that external access survives normal service restarts and a complete host reboot.

### Work

#### Test 1 — bounded application restart

Run:

```bash
/srv/gym-tracker/scripts/restart.sh
```

Verify:

- API, web, and proxy return;
- PostgreSQL remains running;
- monitoring remains running;
- `cloudflared` remains running;
- public access returns;
- Access policy remains active.

#### Test 2 — tunnel service restart

Run:

```bash
sudo systemctl restart cloudflared
sudo systemctl status cloudflared --no-pager
```

Verify:

- temporary interruption is bounded;
- connector returns healthy;
- public hostname returns;
- application containers are unaffected.

#### Test 3 — temporary network interruption

Where safe and controlled, validate that the connector reconnects after the host's internet path returns. Do not perform an uncontrolled network change that risks losing SSH access without a recovery path.

#### Test 4 — full host reboot

Before reboot:

```bash
/srv/gym-tracker/scripts/status.sh
sudo /srv/gym-tracker/scripts/backup-status.sh
```

Then reboot using the established safe procedure.

After reboot, verify:

```bash
systemctl is-active cloudflared
systemctl is-active docker
/srv/gym-tracker/scripts/status.sh
```

Also verify:

- LAN URL;
- public hostname;
- Cloudflare Access login;
- owner application login;
- existing production data;
- Prometheus targets;
- Grafana via SSH tunnel;
- timers;
- Telegram alert state;
- no failed units beyond any documented pre-existing condition.

### Monitoring additions

At minimum, document how to inspect:

```bash
sudo systemctl status cloudflared --no-pager
sudo journalctl -u cloudflared --since "1 hour ago" --no-pager
```

Consider adding a lightweight alert only if it provides meaningful signal and does not duplicate existing public availability monitoring. Stage 1 does not require a full new monitoring subsystem.

### Completion criteria

- Tunnel and application return automatically.
- Public access recovers without manual reconstruction.
- Data remains intact.
- Existing monitoring and backup schedules remain operational.

---

## Step 11 — Execute the real external black-box workout

### Goal

Validate the production system as an actual user under realistic conditions, without using internal operational access to assist the workout.

### Test rules

During the workout:

- use the public HTTPS hostname;
- use mobile data or another external network;
- do not use home Wi-Fi;
- begin logged out;
- do not SSH into the server;
- do not inspect PostgreSQL;
- do not modify production records manually;
- do not correct failures through admin tooling;
- note the user-visible symptom before any later investigation.

### Test preparation

1. Confirm the owner account credentials work.

2. Confirm Cloudflare OTP email delivery.

3. Confirm phone battery and mobile connectivity.

4. Record:
   - deployed commit;
   - test start time;
   - phone model;
   - browser version;
   - network type.

5. Confirm there is a recent successful backup before beginning.

6. Create a simple observation note for:
   - friction;
   - confusion;
   - latency;
   - errors;
   - missing feedback;
   - data inconsistency.

### Required black-box sequence

1. Disable Wi-Fi on the phone.

2. Open:

   ```text
   https://<APP_HOSTNAME>
   ```

3. Complete Cloudflare one-time PIN authentication.

4. Log in to the existing Gym Tracker account.

5. Start a new workout.

6. Add multiple exercises.

7. Record several sets.

8. Edit an earlier set.

9. Use exercise reordering or other core structure operations where supported.

10. Lock the phone or leave the browser temporarily.

11. Return to the application.

12. Confirm the active workout resumes correctly.

13. Introduce a brief realistic connectivity interruption, for example:
    - short airplane-mode toggle; or
    - temporary mobile signal loss.

14. Observe:
    - whether unsaved state is clearly identified;
    - whether retry behaviour is understandable;
    - whether duplicate submissions occur;
    - whether the app recovers.

15. Finish the workout.

16. Open workout history.

17. Verify:
    - workout appears once;
    - exercises are correct;
    - set order is correct;
    - values are correct;
    - timestamps are reasonable.

18. Log out.

19. Close the browser.

20. Reopen the hostname later.

21. Complete Access authentication if required.

22. Log in again.

23. Confirm the completed workout remains present and correct.

### User-experience observations

Record any issue involving:

- Access barrier friction;
- login friction;
- slow first load;
- mobile viewport;
- touch targets;
- keyboard behaviour;
- rest timer persistence;
- active-workout resume;
- unclear saving state;
- duplicate records;
- navigation confusion;
- session expiration;
- logout behaviour;
- history accuracy;
- error messages.

### Pass conditions

The test passes only if:

- the complete workout can be recorded;
- no data is lost;
- no duplicate workout or set is created;
- temporary interruption does not silently corrupt data;
- history is correct;
- logout and later login preserve access and data;
- the application remains acceptably usable over mobile data.

A usability issue may be logged without failing Stage 1 if it is minor. Data loss, authorization failure, duplicate writes, inability to resume, or inability to complete the workout are Stage 1 blockers.

---

## Step 12 — Post-test technical review and closeout

### Goal

Correlate the black-box experience with server evidence, confirm backup coverage, fix blockers, and formally close Stage 1.

### Work

After the workout, reconnect operationally:

```bash
ssh gym-prod
/srv/gym-tracker/scripts/status.sh
/srv/gym-tracker/scripts/logs-errors.sh
```

Inspect relevant recent logs:

```bash
/srv/gym-tracker/scripts/logs-recent.sh api web
/srv/gym-tracker/scripts/logs-errors.sh postgres
/srv/gym-tracker/scripts/logs-recent.sh proxy
sudo journalctl -u cloudflared --since "<TEST_START_TIME>" --no-pager
```

Review:

- API errors;
- web/BFF errors;
- Caddy errors;
- PostgreSQL errors;
- tunnel reconnects;
- authentication or session anomalies;
- duplicate requests;
- unexpected latency;
- sensitive-value redaction;
- Access-denied events.

### Data validation

Using only approved operator methods:

- confirm one completed workout exists;
- confirm the expected exercises and sets;
- confirm no duplicate records;
- confirm the correct owner owns every created record;
- confirm no unexplained user was created;
- confirm registration attempts did not create data.

Avoid making production data “look correct” by manually editing it before documenting any defect.

### Monitoring validation

Confirm:

- all expected Prometheus targets are healthy;
- no unexplained alert fired;
- any expected restart alert resolved;
- Grafana dashboards show plausible application and host behaviour;
- disk, memory, database, and container state remain healthy.

### Backup validation

Wait for or manually trigger the next appropriate backup opportunity after the test:

```bash
sudo systemctl start gym-tracker-backup.service
sudo systemctl status gym-tracker-backup.service --no-pager
sudo /srv/gym-tracker/scripts/backup-status.sh
```

Confirm:

- backup succeeds;
- off-machine snapshot exists;
- backup metrics update;
- temporary staging is removed;
- no secret is printed into ordinary logs.

A full restore rehearsal is not necessarily required again solely for Stage 1 if the schema and backup design did not materially change. If Stage 1 introduces a migration or changes required recovery configuration, perform an appropriate restore validation before closure.

### Documentation updates

Update the operational source of truth with:

- Stage 1 completion date;
- production hostname;
- Cloudflare Tunnel name;
- `cloudflared` service status commands;
- Access application and policy names;
- exact approved email, stored only where appropriate;
- registration mode;
- deployed commit;
- rollback procedure;
- external test result;
- known limitations;
- confirmation that no router port forwarding exists;
- confirmation that monitoring remains private.

Do not document secret values.

### Final defect classification

Classify findings:

| Severity | Stage 1 consequence |
|---|---|
| Critical — security breach, other-user access, secret leak, data loss | Disable public hostname and fix before retest |
| High — core workout cannot complete, session corruption, duplicate writes | Fix before Stage 1 completion |
| Medium — important workflow friction with workaround | Fix or explicitly accept before closure |
| Low — visual or wording issue | Record for later work |

### Completion criteria

Stage 1 may be marked complete when:

- all mandatory acceptance criteria pass;
- critical and high defects are closed;
- accepted medium defects are documented;
- final deployed commit is recorded;
- public hostname is stable;
- owner-only Access policy is verified;
- registration remains disabled;
- black-box workout succeeds;
- post-test logs are understood;
- backup succeeds after the test;
- rollback and emergency shutdown procedures are documented.
