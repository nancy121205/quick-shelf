import { NextResponse } from "next/server";
import { getAdminConfig, setAdminSessionCookie, verifyAdminCredentials } from "../../../../../lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const adminConfig = getAdminConfig();
    if (!adminConfig.config) {
      return NextResponse.json(
        { success: false, error: `Admin authentication is not configured. Missing: ${adminConfig.missing.join(", ")}` },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!verifyAdminCredentials(email, password)) {
      return NextResponse.json(
        { success: false, error: "Invalid admin password" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    setAdminSessionCookie(response);
    return response;
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json(
      { success: false, error: "Unable to sign in" },
      { status: 500 }
    );
  }
}