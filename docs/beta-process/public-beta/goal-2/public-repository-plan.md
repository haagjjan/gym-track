# Public Repository Plan

Item 10 of the [Goal 2 decision record](goal-2-decision-record.md). Decided 2026-08-08.

Current state: `github.com/haagjjan/gym-track`, **private**. Nothing is public yet.

## Decisions

| Question | Decision |
|---|---|
| Publish? | **Yes** |
| Licence | **MIT** — see [LICENSE](../../../../LICENSE) |
| History | **Full history**, not a squashed snapshot |
| Homelab documentation | **Published** — `docs/server/**` goes public |
| Third-party assets | Carved out of the MIT grant — see [NOTICE](../../../../NOTICE) |

**Why MIT.** The purpose is demonstrating competence, not controlling use. Every direct
dependency is MIT or Apache, and the exercise catalog is public domain, so nothing constrains
the choice. Apache-2.0's patent grant is irrelevant here; AGPL would defend against a threat
that does not exist for a fifty-user hobby beta while adding friction for the exact reader the
repository is for.

**Why full history.** 899 commits showing how the project actually developed is a genuine
signal to a technical reader — more than a single squashed commit. The controller accepts that
this publishes six author identities, machine hostnames, a university email address, and branch
and tag names encoding deployment timestamps. None of these are secrets; they are ordinary
development traces.

**Why the homelab documentation is published.** `docs/server/**` describes host hardening,
Docker platform setup, reverse proxying, monitoring, alerting and backup/recovery design. It is
some of the strongest portfolio material in the repository, and the operator intends to publish
homelab documentation independently regardless.

The risk was assessed rather than assumed. The private addresses (`192.168.1.57`,
`192.168.86.178`) are RFC1918 and meaningless outside the LAN. The SSH policy is key-only,
`AllowUsers`-restricted, and reachable only from two LAN ranges — publishing it largely
demonstrates that SSH is not internet-reachable. The filesystem layout is useful only to
someone already inside.

A scan for genuinely identifying material found none: no MAC addresses, no public IPv4, no SSH
public keys, no credential values. The reports state explicitly that passwords, private keys,
fingerprints and serial numbers were excluded when they were written
(`reports/02-os-admin-foundation-report.md:329`), and that discipline held.

## One redaction

`reports/01-host-baseline-audit-report.md:112` published the ISP-assigned IPv6 prefix
`2a04:ee40:20c5:c700::/64`.

This differs in kind from the RFC1918 addresses. A `/64` is globally unique and tied to a
specific subscriber line, so it identifies the ISP and the connection, and it is stable enough
to correlate against anywhere else that prefix appears. Combined with the controller's home
address — public by design on the privacy pages — it is corroborating rather than merely
descriptive.

Practical attack value is still near zero: a `/64` cannot be scanned, and IPv6 is not exposed
because ingress runs through Cloudflare Tunnel with no port forwarding. But removing it is
free, and the file's own guidance already required it
(`wave-a-host-fundation/01-host-baseline-audit.md:84`).

Redacted in the working tree on 2026-08-08. **It remains in Git history**, which the full-history
decision publishes. See below.

## The history/redaction tension

Redacting a file today does not remove it from history. Anyone can `git log` the earlier
revision. So with full history published, the IPv6 prefix goes public unless it is scrubbed
from history first.

Since the repository is still private and has only one contributor, a targeted scrub is cheap
and preserves every commit, message and date — only hashes change:

```sh
pipx install git-filter-repo
echo '2a04:ee40:20c5:c700::/64==>an ISP-assigned /64 prefix' > /tmp/redact.txt
git filter-repo --replace-text /tmp/redact.txt
git push --force origin main
```

This is the controller's decision to make and execute; it is not performed as part of Goal 2.
Declining it is defensible — the residual risk is genuinely low.

## Secret scan

`gitleaks` over 760 commits returned four findings, **all false positives**: the same line in
four commits, `const STORAGE_KEY = "body-cockpit.favorite-lifts.v1"` in
`apps/web/src/features/dashboard/use-favorite-lifts.ts`, matched by the generic-api-key rule on
entropy alone. It is a `localStorage` key name.

An independent check across all history for added `.env` files, private keys, certificates and
key material found nothing beyond `.env.example`.

Recommended before flipping visibility: add a `.gitleaksignore` for those four fingerprints so
future scans are clean, and run `gitleaks` in CI.

## Publish these later, not at launch

`docs/beta-process/public-beta/launch-gates.md` and `security-review.md` are a different
category from the homelab documentation. The homelab docs say *here is how I built it*. These
two say *here is what I know is not yet verified* — an itemised list of one's own unverified
controls, published while the service is live and the gates are unchecked.

This is timing rather than exclusion. Once the gates are checked and the beta is running, the
same documents read as evidence of a rigorous verification programme, which is exactly the
impression worth giving. Publishing them beforehand mostly gives a reader a roadmap.

**Recommendation:** hold both until the launch gates are actually checked, then publish.

## Before flipping visibility

- [ ] Confirm the 3D model terms and replace the placeholder in NOTICE. If redistribution is
      not permitted, gitignore the `.fbx` files and document how to regenerate them — noting
      they would also need removing from history.
- [ ] Decide on the IPv6 history scrub.
- [ ] Add `.gitleaksignore`; add gitleaks to CI.
- [ ] Rewrite `README.md` — it still describes a pre-beta project and points at
      `docs/99-current-project-state.md`, the most outdated document in the repository.
- [ ] Genericise `192.168.1.57` in `compose.yaml:80-81` and `.env.example:29-30`. It is a
      shipped default, not documentation, and it should not be a real address in either case.
- [ ] Decide whether `_legacy-reference/` is published — 20+ files of superseded UI that add
      noise to a portfolio repository.
- [ ] Move `launch-gates.md` and `security-review.md` publication to after the gates pass.
