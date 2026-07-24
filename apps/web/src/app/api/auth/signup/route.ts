import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyAuthRequest } from "../../../../features/auth/auth-api-proxy";
import { isRegistrationEnabled } from "../../../../features/auth/registration-mode";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isRegistrationEnabled()) {
    return NextResponse.json(
      {
        error: {
          code: "REGISTRATION_DISABLED",
          message: "Registration is currently disabled."
        }
      },
      { status: 403 }
    );
  }

  return proxyAuthRequest(request, "signup");
}
