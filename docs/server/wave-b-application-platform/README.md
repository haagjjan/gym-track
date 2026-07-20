# Wave B — Application Platform

**Status:** Planned; not executable yet.

Wave B will be written after Wave A is executed and reviewed. The Stage 1 audit and Docker findings may materially change the implementation details.

Planned documents:

```text
05-server-filesystem-and-repository.md
06-postgresql-foundation.md
07-gym-tracker-deployment.md
08-reverse-proxy-and-private-lan-access.md
```

Expected Wave B outcome:

- deliberate `/srv/gym-tracker` filesystem structure;
- separation of repository, secrets, persistent data, backups, and operations;
- secure repository access;
- persistent PostgreSQL with restricted credentials;
- migrations and restore-capable backups;
- containerized Next.js and Fastify deployment;
- one controlled private LAN entry point;
- no public exposure.

This README is not permission to execute Wave B.
