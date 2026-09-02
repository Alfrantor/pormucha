import { Boxes, FlaskConical, MapPinned, Package2, FlaskRound, Layers3 } from "lucide-react";
import { db } from "@/lib/db";
import { loadProductionFormulas } from "@/lib/production-formulas";
import { CatalogSectionPage } from "./_components/CatalogSectionPage";

export default async function CatalogPage() {
  const [products, flavors, rawMaterials, tanks, locations, formulas] = await Promise.all([
    db.product.count({ where: { isArchived: false } }),
    db.flavor.count({ where: { isArchived: false } }),
    db.rawMaterial.count({ where: { isArchived: false } }),
    db.tank.count({ where: { isActive: true } }),
    db.location.count({ where: { isArchived: false } }),
    loadProductionFormulas().catch(() => []),
  ]);

  return (
    <CatalogSectionPage
      eyebrow="Catalogo"
      title="Centro de catálogos"
      description="Aquí concentras los catálogos operativos y comerciales del ERP: productos, sabores, materias primas y consumibles, cubetas, almacenes o plantas, y fórmulas."
      stats={[
        { label: "Productos activos", value: products },
        { label: "Sabores activos", value: flavors },
        { label: "Materias primas", value: rawMaterials },
        { label: "Cubetas activas", value: tanks },
        { label: "Plantas / almacenes", value: locations },
        { label: "Fórmulas", value: formulas.length },
      ]}
      cards={[
        { href: "/admin/catalog/products", title: "Productos", desc: "Packs y configuración comercial", icon: <Package2 size={18} />, meta: "Precio, imagen y suscripción" },
        { href: "/admin/catalog/flavors", title: "Sabores", desc: "Sabores regulares y euro con su inventario y precio", icon: <FlaskRound size={18} />, meta: "POS, web e inventario" },
        { href: "/admin/catalog/raw-materials", title: "Materias primas y consumibles", desc: "Insumos clasificados por tipo y unidad", icon: <Boxes size={18} />, meta: "Materia prima / consumibles" },
        { href: "/admin/catalog/tanks", title: "Tanques de resguardo", desc: "Contenedores operativos y sus estados", icon: <Layers3 size={18} />, meta: "Producción y trazabilidad" },
        { href: "/admin/catalog/locations", title: "Almacenes / plantas", desc: "Lerma, Mérida y demás ubicaciones", icon: <MapPinned size={18} />, meta: "Ubicaciones activas" },
        { href: "/admin/catalog/formulas", title: "Fórmulas", desc: "Recetas operativas para producción", icon: <FlaskConical size={18} />, meta: "Acidificante y sabor" },
      ]}
    />
  );
}
