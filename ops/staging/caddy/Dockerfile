FROM docker.io/library/caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648

# The upstream binary carries CAP_NET_BIND_SERVICE. Staging listens on 8080,
# so copy it without file capabilities to remain compatible with cap_drop: ALL.
RUN cp /usr/bin/caddy /usr/bin/caddy-unprivileged \
  && rm /usr/bin/caddy \
  && mv /usr/bin/caddy-unprivileged /usr/bin/caddy
