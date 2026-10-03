import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "../../../../app/generated/prisma/client";
import { requireAdmin, serverError } from "../../../../lib/admin-api";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  try {
    const settings = await prisma.adminConfig.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, whatsappNumber: true, activeDesign: true, siteSettings: true } });
    return NextResponse.json({ success: true, data: settings ?? { whatsappNumber: "", activeDesign: "design1", siteSettings: {} } });
  } catch (error) {
    return serverError(error, "Unable to load settings");
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as { whatsappNumber?: unknown; activeDesign?: unknown; siteSettings?: unknown };
    const data = { whatsappNumber: typeof body.whatsappNumber === "string" ? body.whatsappNumber.trim() : null, activeDesign: typeof body.activeDesign === "string" && body.activeDesign.trim() ? body.activeDesign.trim() : "design1", siteSettings: (body.siteSettings && typeof body.siteSettings === "object" ? body.siteSettings : {}) as Prisma.InputJsonValue };
    const existing = await prisma.adminConfig.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } });
    const settings = existing ? await prisma.adminConfig.update({ where: { id: existing.id }, data, select: { whatsappNumber: true, activeDesign: true, siteSettings: true } }) : await prisma.adminConfig.create({ data, select: { whatsappNumber: true, activeDesign: true, siteSettings: true } });
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return serverError(error, "Unable to save settings");
  }
}