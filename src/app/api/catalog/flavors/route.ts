import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function resolveFlavorImage(name: string, image?: string | null) {
  const cleanName = name
    .toLowerCase()
    .replace("kombucha", "")
    .trim()
    .replace(/\s+/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return image || `/${cleanName}.jpeg`;
}

export async function GET() {
  try {
    const flavors = await db.flavor.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        name: true,
        image: true,
        imageEuro: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      flavors: flavors.map((flavor) => ({
        ...flavor,
        image: resolveFlavorImage(flavor.name, flavor.image),
        imageEuro: flavor.imageEuro || resolveFlavorImage(flavor.name, flavor.image),
      })),
    });
  } catch (error) {
    console.error("Error loading active flavors:", error);
    return NextResponse.json({ error: "No se pudieron cargar los sabores." }, { status: 500 });
  }
}
