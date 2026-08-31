import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalRedirectTarget,
  evaluateRequestSecurity,
  readWebSecurityConfig,
  securityHeaders
} from "./request-security";

const productionEnv = {
  APP_ALLOWED_HOSTS: "192.168.1.57",
  APP_ALLOWED_ORIGINS: "http://192.168.1.57",
  APP_BASE_URL: "https://app.gymtrack.ch",
  HSTS_ENABLED: "true",
  NODE_ENV: "production"
};

describe("web request security", () => {
  it("uses the canonical hostname and explicitly configured LAN exceptions", () => {
    const config = readWebSecurityConfig(productionEnv);

    assert.equal(config.canonicalOrigin, "https://app.gymtrack.ch");
    assert.deepEqual(
      [...config.allowedHosts].sort(),
      ["192.168.1.57", "app.gymtrack.ch"]
    );
    assert.deepEqual(
      [...config.allowedOrigins].sort(),
      ["http://192.168.1.57", "https://app.gymtrack.ch"]
    );
  });

  it("redirects the bare domain and its www variant to the canonical origin", () => {
    const config = readWebSecurityConfig(productionEnv);

    assert.deepEqual(
      [...config.redirectHosts].sort(),
      ["gymtrack.ch", "www.gymtrack.ch"]
    );
    assert.equal(
      canonicalRedirectTarget({ host: "www.gymtrack.ch", pathAndQuery: "/" }, config),
      "https://app.gymtrack.ch/"
    );
    assert.equal(
      canonicalRedirectTarget({ host: "gymtrack.ch", pathAndQuery: "/login?next=%2F" }, config),
      "https://app.gymtrack.ch/login?next=%2F"
    );
  });

  it("never redirects a host that is served directly", () => {
    const config = readWebSecurityConfig(productionEnv);

    for (const host of ["app.gymtrack.ch", "192.168.1.57", "unknown.example"]) {
      assert.equal(canonicalRedirectTarget({ host, pathAndQuery: "/" }, config), null);
    }
  });

  it("lets the deployment override or disable the redirect hosts", () => {
    const overridden = readWebSecurityConfig({
      ...productionEnv,
      APP_REDIRECT_HOSTS: "gymtrack.example, www.gymtrack.example"
    });

    assert.deepEqual(
      [...overridden.redirectHosts].sort(),
      ["gymtrack.example", "www.gymtrack.example"]
    );

    const disabled = readWebSecurityConfig({ ...productionEnv, APP_REDIRECT_HOSTS: "" });

    assert.equal(disabled.redirectHosts.size, 0);
  });

  it("derives no redirect hosts for a hostname without a registrable domain", () => {
    const config = readWebSecurityConfig({
      APP_BASE_URL: "http://localhost:3000",
      APP_ENV: "local",
      NODE_ENV: "production"
    });

    assert.equal(config.redirectHosts.size, 0);
  });

  it("fails closed when production has no canonical URL", () => {
    assert.throws(
      () => readWebSecurityConfig({ NODE_ENV: "production" }),
      /APP_BASE_URL is required/
    );
  });

  it("rejects a non-HTTPS production canonical URL", () => {
    assert.throws(
      () =>
        readWebSecurityConfig({
          APP_BASE_URL: "http://app.gymtrack.ch",
          NODE_ENV: "production"
        }),
      /must use HTTPS/
    );
  });

  it("allows the explicit local Compose HTTP exception", () => {
    const config = readWebSecurityConfig({
      APP_BASE_URL: "http://localhost:3000",
      APP_ENV: "local",
      NODE_ENV: "production"
    });

    assert.equal(config.canonicalOrigin, "http://localhost:3000");
  });

  it("allows the explicit private-LAN HTTP deployment exception", () => {
    const config = readWebSecurityConfig({
      APP_BASE_URL: "http://192.168.1.57",
      APP_ENV: "private-lan",
      NODE_ENV: "production"
    });

    assert.equal(config.canonicalOrigin, "http://192.168.1.57");
    assert.equal(config.allowedHosts.has("192.168.1.57"), true);
    assert.equal(config.allowedHosts.has("localhost"), true);
  });

  it("rejects untrusted hosts without redirecting", () => {
    const rejection = evaluateRequestSecurity(
      request({ host: "attacker.example", pathname: "/login" }),
      readWebSecurityConfig(productionEnv)
    );

    assert.deepEqual(rejection, {
      code: "UNTRUSTED_HOST",
      message: "The request host is not allowed.",
      status: 421
    });
  });

  it("rejects malformed host authorities instead of reinterpreting them", () => {
    const config = readWebSecurityConfig(productionEnv);

    for (const host of [
      "attacker@app.gymtrack.ch",
      "app.gymtrack.ch/path",
      "app.gymtrack.ch#fragment"
    ]) {
      assert.equal(
        evaluateRequestSecurity(request({ host, pathname: "/login" }), config)?.code,
        "UNTRUSTED_HOST"
      );
    }
  });

  it("allows same-origin state changes through the BFF", () => {
    const rejection = evaluateRequestSecurity(
      request({
        method: "POST",
        origin: "https://app.gymtrack.ch",
        pathname: "/api/auth/login",
        secFetchSite: "same-origin"
      }),
      readWebSecurityConfig(productionEnv)
    );

    assert.equal(rejection, null);
  });

  it("rejects missing, cross-origin, and preflight API requests", () => {
    const config = readWebSecurityConfig(productionEnv);

    assert.equal(
      evaluateRequestSecurity(
        request({ method: "POST", origin: null, pathname: "/api/auth/login" }),
        config
      )?.code,
      "CSRF_ORIGIN_MISMATCH"
    );
    assert.equal(
      evaluateRequestSecurity(
        request({
          method: "POST",
          origin: "https://attacker.example",
          pathname: "/api/auth/login",
          secFetchSite: "cross-site"
        }),
        config
      )?.code,
      "CSRF_ORIGIN_MISMATCH"
    );
    assert.equal(
      evaluateRequestSecurity(
        request({
          method: "POST",
          origin: "https://attacker@app.gymtrack.ch",
          pathname: "/api/auth/login"
        }),
        config
      )?.code,
      "CSRF_ORIGIN_MISMATCH"
    );
    assert.equal(
      evaluateRequestSecurity(
        request({ method: "OPTIONS", pathname: "/api/auth/login" }),
        config
      )?.code,
      "CORS_NOT_ALLOWED"
    );
  });

  it("keeps safe page and API reads available on an allowed host", () => {
    const config = readWebSecurityConfig(productionEnv);

    assert.equal(evaluateRequestSecurity(request({ pathname: "/login" }), config), null);
    assert.equal(
      evaluateRequestSecurity(request({ pathname: "/api/auth/me" }), config),
      null
    );
  });

  it("adds HSTS only for the canonical HTTPS host", () => {
    const config = readWebSecurityConfig(productionEnv);

    assert.match(
      securityHeaders(config, "app.gymtrack.ch")["Strict-Transport-Security"] ?? "",
      /max-age=31536000/
    );
    assert.equal(
      securityHeaders(config, "192.168.1.57")["Strict-Transport-Security"],
      undefined
    );
    assert.equal(securityHeaders(config, "app.gymtrack.ch")["X-Frame-Options"], "DENY");
  });

  it("keeps HSTS off until the operator explicitly enables it", () => {
    const config = readWebSecurityConfig({
      APP_BASE_URL: "https://app.gymtrack.ch",
      HSTS_ENABLED: "false",
      NODE_ENV: "production"
    });

    assert.equal(
      securityHeaders(config, "app.gymtrack.ch")["Strict-Transport-Security"],
      undefined
    );
  });
});

function request(overrides: Partial<Parameters<typeof evaluateRequestSecurity>[0]> = {}) {
  return {
    host: "app.gymtrack.ch",
    method: "GET",
    origin: null,
    pathname: "/",
    secFetchSite: null,
    ...overrides
  };
}
