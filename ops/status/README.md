# External status page

`public/` is a dependency-free static status page intended for a host independent of the Gym Progress Tracker app, API, database, and Mac mini. Publish this directory at `status.gymtrack.ch` through a separately authenticated static host.

Before every publication, edit the visible review timestamp and verify all six component states. An incident update must name the affected component, user impact, investigation state, and next-update time without exposing personal data, secrets, internal hostnames, or exploit details.

The checked-in page is a template, not a live status claim. The launch gate remains closed until DNS, independent hosting, TLS, and the incident publication rehearsal are verified.
