import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { GET, dynamic } from "./.well-known/assetlinks.json/route";

const fingerprint = Array(32).fill("AB").join(":");
const secondFingerprint = Array(32).fill("CD").join(":");
const originalValue = process.env.ANDROID_CERT_SHA256;

afterEach(() => {
  if (originalValue === undefined) delete process.env.ANDROID_CERT_SHA256;
  else process.env.ANDROID_CERT_SHA256 = originalValue;
});

describe("Android association", () => {
  it("serves the configured association as JSON at request time", async () => {
    process.env.ANDROID_CERT_SHA256 = ` ${fingerprint}, , ${secondFingerprint} `;
    const response = GET();
    assert.equal(dynamic, "force-dynamic");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.equal(response.headers.get("location"), null);
    assert.deepEqual(await response.json(), [{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "ch.gymtrack.app",
        sha256_cert_fingerprints: [fingerprint, secondFingerprint]
      }
    }]);
  });

  it("returns 404 when configuration is missing or empty", () => {
    delete process.env.ANDROID_CERT_SHA256;
    assert.equal(GET().status, 404);
    for (const value of ["", "   ", " , , "]) {
      process.env.ANDROID_CERT_SHA256 = value;
      assert.equal(GET().status, 404);
    }
  });
});
