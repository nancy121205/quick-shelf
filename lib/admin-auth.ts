import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "catalog-admin-session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type AdminConfig = {
  email: string;
  password: string;
  sessionSecret: string;
};

export function getAdminConfig(): { config: AdminConfig | null; missing: string[] } {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const missing = [
    !email ? "ADMIN_EMAIL" : null,
    !password ? "ADMIN_PASSWORD" : null,
    !sessionSecret ? "ADMIN_SESSION_SECRET" : null,
  ].filter((name): name is string => name !== null);

  return missing.length > 0 || !email || !password || !sessionSecret
    ? { config: null, missing }
    : { config: { email, password, sessionSecret }, missing: [] };
}

// Demo/admin credentials are configured only through ADMIN_EMAIL and ADMIN_PASSWORD in the deployment environment.
function getAdminEmail() {
  const email = getAdminConfig().config?.email;

  if (!email) {
    throw new Error("ADMIN_EMAIL is not configured");
  }

  return email;
}

function getAdminPassword() {
  const password = getAdminConfig().config?.password;

  if (!password) {
    throw new Error("ADMIN_PASSWORD is not configured");
  }

  return password;
}

function getSessionSecret() {
  const secret = getAdminConfig().config?.sessionSecret;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminPasswordConfigured() {
  return getAdminConfig().config !== null;
}

export function verifyAdminCredentials(email: string, password: string) {
  return safeEqual(email.trim().toLowerCase(), getAdminEmail().toLowerCase()) && safeEqual(password, getAdminPassword());
}

export function createAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expiresAt);

  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSession(value?: string) {
  if (!value) {
    return false;
  }

  const [expiresAt, signature] = value.split(".");

  if (!expiresAt || !signature || Number(expiresAt) <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  return safeEqual(signature, sign(expiresAt));
}

export async function isAdminAuthenticated() {
  if (!isAdminPasswordConfigured()) {
    return false;
  }

  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(SESSION_COOKIE)?.value);
}

export function setAdminSessionCookie(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }) {
  response.cookies.set(SESSION_COOKIE, createAdminSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export { SESSION_COOKIE };