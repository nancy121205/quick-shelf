import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "./admin-auth";

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { success: false, error: "Admin authentication required" },
      { status: 401 }
    );
  }

  return null;
}

export function serverError(error: unknown, message: string) {
  console.error(message, error);
  return NextResponse.json(
    { success: false, error: message },
    { status: 500 }
  );
}