export const dynamic = "force-dynamic";

export function GET(): Response {
  const fingerprints = process.env.ANDROID_CERT_SHA256
    ?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];

  if (fingerprints.length === 0) {
    return new Response(null, { status: 404 });
  }

  return Response.json([{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "ch.gymtrack.app",
      sha256_cert_fingerprints: fingerprints
    }
  }]);
}
