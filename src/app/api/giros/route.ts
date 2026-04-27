import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const giros = await (db as any).giro.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(giros);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
