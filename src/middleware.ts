/**
 * Optional single-user authentication.
 *
 * When APP_AUTH_TOKEN is set, all app and API routes require either
 * `Authorization: Bearer <token>` or HTTP Basic auth with the token as the
 * password. Leaving APP_AUTH_TOKEN empty keeps local development frictionless.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getAppAuthToken } from "@/lib/env";

const REALM = "Job Application Assistant";

export function middleware(request: NextRequest) {
  const token = getAppAuthToken();
  if (!token) return NextResponse.next();
  if (isAuthorized(request.headers.get("authorization"), token)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function isAuthorized(header: string | null, token: string): boolean {
  if (!header) return false;
  if (header === `Bearer ${token}`) return true;
  if (!header.startsWith("Basic ")) return false;

  try {
    const decoded = atob(header.slice("Basic ".length));
    const password = decoded.split(":", 2)[1] ?? "";
    return password === token;
  } catch {
    return false;
  }
}
