import { Boxes, FlaskConical, MapPinned, Package2, Layers3 } from "lucide-react";
import { CatalogSectionPage } from "./_components/CatalogSectionPage";

export default async function CatalogPage() {
  return (
    <CatalogSectionPage
      cards={[
        { href: "/admin/catalog/products", title: "Productos", desc: "Packs y configuración comercial", icon: <Package2 size={18} />, meta: "Precio, imagen y suscripción" },
        { href: "/admin/catalog/raw-materials", title: "Materias primas y consumibles", desc: "Insumos clasificados por tipo y unidad", icon: <Boxes size={18} />, meta: "Materia prima / consumibles" },
        { href: "/admin/catalog/tanks", title: "Tanques de resguardo", desc: "Contenedores operativos y sus estados", icon: <Layers3 size={18} />, meta: "Producción y trazabilidad" },
        { href: "/admin/catalog/locations", title: "Almacenes / plantas", desc: "Lerma, Mérida y demás ubicaciones", icon: <MapPinned size={18} />, meta: "Ubicaciones activas" },
        { href: "/admin/catalog/formulas", title: "Fórmulas", desc: "Recetas operativas para producción", icon: <FlaskConical size={18} />, meta: "Acidificante y sabor" },
      ]}
    />
  );
}
