FROM docker.io/library/postgres:17.10-alpine3.24@sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193

RUN addgroup -g 10001 staging-runtime \
  && addgroup postgres staging-runtime

COPY ops/staging/postgres/init-roles.sh /docker-entrypoint-initdb.d/10-init-roles.sh

RUN chmod 0755 /docker-entrypoint-initdb.d/10-init-roles.sh
