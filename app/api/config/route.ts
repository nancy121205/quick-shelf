import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const config = await prisma.adminConfig.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        activeDesign: true,
        whatsappNumber: true,
        siteSettings: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        activeDesign: config?.activeDesign ?? "design1",
        whatsappNumber: config?.whatsappNumber ?? null,
        siteSettings:
          config?.siteSettings && typeof config.siteSettings === "object"
            ? config.siteSettings
            : {},
      },
    });
  } catch (error) {
    console.error("Failed to fetch catalog config:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load catalog config",
      },
      { status: 500 }
    );
  }
}
