import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const EURO_IMAGE_BY_FLAVOR: Record<string, string> = {
  "kombucha te verde": "/euro-verde.jpeg",
  "kombucha te negro": "/euro-negro.jpeg",
  "kombucha jamaica": "/euro-jamaica.jpeg",
  "kombucha pina": "/euro-piña.jpeg",
};

function normalizeFlavorKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveFlavorImage(name: string, image?: string | null) {
  const normalized = normalizeFlavorKey(name);
  const euroImage = EURO_IMAGE_BY_FLAVOR[normalized];
  if (euroImage) return euroImage;

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
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      flavors: flavors.map((flavor) => ({
        ...flavor,
        image: resolveFlavorImage(flavor.name, flavor.image),
      })),
    });
  } catch (error) {
    console.error("Error loading active flavors:", error);
    return NextResponse.json({ error: "No se pudieron cargar los sabores." }, { status: 500 });
  }
}
