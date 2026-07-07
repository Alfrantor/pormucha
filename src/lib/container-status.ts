export type ContainerStatus = "AVAILABLE" | "IN_USE" | "INACTIVE";

export function getContainerStatus(container: { isActive?: boolean | null }, activeProduction?: unknown): ContainerStatus {
  if (!container?.isActive) return "INACTIVE";
  if (activeProduction) return "IN_USE";
  return "AVAILABLE";
}

export function getContainerStatusLabel(status: ContainerStatus) {
  if (status === "IN_USE") return "En proceso";
  if (status === "INACTIVE") return "Inactiva";
  return "Disponible";
}

export function getContainerStatusClasses(status: ContainerStatus) {
  if (status === "IN_USE") return "bg-amber-100 text-amber-700";
  if (status === "INACTIVE") return "bg-slate-100 text-slate-500";
  return "bg-emerald-100 text-emerald-700";
}
