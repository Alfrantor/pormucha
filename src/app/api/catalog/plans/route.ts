import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const plans = await db.plan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        productId: true,
        unitCount: true,
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Error loading active plans:", error);
    return NextResponse.json({ error: "No se pudieron cargar los planes." }, { status: 500 });
  }
}
