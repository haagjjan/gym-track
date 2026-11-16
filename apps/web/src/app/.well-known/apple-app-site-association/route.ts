export const dynamic = "force-dynamic";

export function GET(): Response {
  const teamId = process.env.APPLE_TEAM_ID?.trim();

  if (!teamId) {
    return new Response(null, { status: 404 });
  }

  return Response.json({
    applinks: {
      details: [{
        appIDs: [`${teamId}.ch.gymtrack.app`],
        components: [
          { "/": "/verify-email*" },
          { "/": "/reset-password*" },
          { "/": "/cancel-deletion*" }
        ]
      }]
    }
  });
}
