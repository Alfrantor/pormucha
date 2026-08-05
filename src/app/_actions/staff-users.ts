"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

function normalizeEmail(value: FormDataEntryValue | null) {
  const email = String(value ?? "").trim().toLowerCase();
  return email.length > 0 ? email : null;
}

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createStaffUser(formData: FormData) {
  const fullName = normalizeText(formData.get("fullName"));
  const email = normalizeEmail(formData.get("email"));
  const role = normalizeText(formData.get("role")) || "vendedor";
  const status = normalizeText(formData.get("status")) || "ACTIVO";
  const notes = normalizeText(formData.get("notes")) || null;

  if (!fullName) {
    throw new Error("El nombre completo es obligatorio.");
  }

  await db.staffUser.create({
    data: {
      fullName,
      email,
      role,
      status,
      notes,
    },
  });

  revalidatePath("/admin/users");
}

export async function updateStaffUser(formData: FormData) {
  const id = normalizeText(formData.get("id"));
  const role = normalizeText(formData.get("role"));
  const status = normalizeText(formData.get("status"));
  const notes = normalizeText(formData.get("notes"));

  if (!id) {
    throw new Error("Falta el usuario a actualizar.");
  }

  await db.staffUser.update({
    where: { id },
    data: {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      notes,
    },
  });

  revalidatePath("/admin/users");
}

export async function deleteStaffUser(formData: FormData) {
  const id = normalizeText(formData.get("id"));

  if (!id) {
    throw new Error("Falta el usuario a eliminar.");
  }

  await db.staffUser.delete({
    where: { id },
  });

  revalidatePath("/admin/users");
}
