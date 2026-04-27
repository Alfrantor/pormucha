# Migración: Reestructura de Clientes y Sistema de Precios

## 📋 Cambios Realizados

### 1. **Modelo de Datos (Schema Prisma)**

#### Cliente mejorado:
- ✅ **Campos fiscales**: RFC, Razón Social, CURP
- ✅ **Clasificación comercial**: Minorista, Mayorista, Distribuidor
- ✅ **Gestión de crédito**: Límite de crédito, crédito utilizado, días de pago
- ✅ **Descuentos personalizados**: Descuento global por cliente
- ✅ **Direcciones múltiples**: Fiscal, envío, oficina con tabla separada
- ✅ **Historial de transacciones**: Créditos, interacciones, notas
- ✅ **Estado del cliente**: Activo, Inactivo, Bloqueado

**Nuevas tablas:**
- `Address` - Direcciones múltiples por cliente
- `Credit` - Gestión de créditos
- `ClientInteraction` - Notas e historial de interacciones

#### Flavor con sistema de precios mejorado:
- ✅ **Dos precios**: Base (minorista) + Mayorista
- ✅ **Escalas dinámicas**: Precios por rangos de cantidad
- ✅ **Descuentos por clasificación**: Precios especiales para mayoristas/distribuidores
- ✅ **Descuentos por cliente**: Precios específicos para clientes
- ✅ **Auditoría completa**: Historial de cambios de precio

**Nuevas tablas:**
- `FlavorPriceScale` - Escalas de precios por cantidad
- `FlavorDiscount` - Descuentos por cliente o clasificación

---

## 🚀 Cómo Aplicar la Migración

### Paso 1: Actualizar base de datos

Cuando la BD esté disponible, ejecuta:

```bash
npx prisma migrate dev --name restructure_clients_pricing
```

Esto creará las nuevas tablas y campos automáticamente.

### Paso 2: Generar cliente de Prisma

```bash
npx prisma generate
```

### Paso 3: Verificar cambios

```bash
npx prisma studio
```

---

## 📂 Nuevos Archivos Creados

### Acciones del servidor:
- `src/app/_actions/clients.ts` - CRUD de clientes, direcciones, interacciones
- `src/app/_actions/flavor-pricing.ts` - Gestión de precios y escalas

### Componentes:
- `src/components/admin/ClientsTable.tsx` - Tabla de clientes con búsqueda
- `src/components/admin/ClientModal.tsx` - Modal crear/editar cliente
- `src/components/admin/PricingManager.tsx` - Gestor de precios, escalas, descuentos

### Páginas:
- `src/app/admin/clientes/page.tsx` - Listado de clientes
- `src/app/admin/clientes/[id]/page.tsx` - Detalle del cliente
- `src/app/admin/precios/page.tsx` - Gestión de precios por flavor

### Utilidades:
- `src/lib/pricing.ts` - Funciones de cálculo de precios para checkout

---

## 🔄 Lógica de Cálculo de Precios

El sistema calcula el precio final en este orden:

```
1. Precio base (minorista)
   ↓
2. Si cantidad >= mínimo mayoreo:
   - Aplicar escala de precios (si existe)
   - O usar precio mayorista
   ↓
3. Si hay cliente:
   - Aplicar descuento específico para ese cliente
   - O aplicar descuento por clasificación
   - O aplicar descuento global del cliente
   ↓
4. Precio final
```

### Ejemplo:
- Flavor: "Chocolate" - $100 minorista, $90 mayorista
- Mínimo mayoreo: 50 unidades
- Escalas:
  - 50-100: $85
  - 101-500: $80
  - 501+: $75
- Cliente es MAYORISTA con descuento 10%

**Compra de 100 unidades:**
- Aplica escala 50-100 = $85
- Aplica descuento 10% = $76.50

**Compra de 600 unidades:**
- Aplica escala 501+ = $75
- Aplica descuento 10% = $67.50

---

## 🔑 Características Principales

### Gestión de Clientes:
- ✅ Crear/editar clientes (persona física o jurídica)
- ✅ RFC con validación de formato mexicano
- ✅ Múltiples direcciones (fiscal, envío, oficina)
- ✅ Límite de crédito con visualización de uso
- ✅ Historial de órdenes, créditos e interacciones
- ✅ Notas y seguimiento de actividad

### Gestión de Precios:
- ✅ Precios base (minorista y mayorista)
- ✅ Escalas de precios dinámicas
- ✅ Descuentos por cantidad, clasificación, cliente
- ✅ Historial completo de cambios
- ✅ Vigencia de descuentos (con fecha fin)

---

## 💡 Integración con Checkout

Para usar el nuevo sistema de precios en el checkout:

```typescript
import { calculateFlavorPrice, calculateCartTotal } from "@/lib/pricing";

// Para un item
const pricing = await calculateFlavorPrice(flavorId, quantity, clientId);

// Para todo el carrito
const cart = await calculateCartTotal(
  [
    { flavorId: "flavor1", quantity: 100 },
    { flavorId: "flavor2", quantity: 50 },
  ],
  clientId
);
```

---

## 🔗 Rutas Nuevas

**Admin:**
- `/admin/clientes` - Listado de clientes
- `/admin/clientes/:id` - Detalle del cliente
- `/admin/precios` - Gestión de precios

---

## ✅ Testing Recomendado

1. Crear clientes de diferentes tipos (FISICA, JURIDICA)
2. Crear direcciones múltiples
3. Configurar precios y escalas
4. Crear descuentos por clasificación
5. Probar cálculo de precios en checkout
6. Verificar historial de cambios

---

## 📝 Notas Importantes

- ✅ RFC se guarda en mayúsculas y se valida con regex mexicana
- ✅ Precios usan tipo Decimal de Prisma (precisión financiera)
- ✅ Todas las fechas están en UTC
- ✅ Los descuentos tienen vigencia (validUntil)
- ✅ El cálculo de precios es transaccional y auditable
- ✅ Los cambios de precio se registran automáticamente en historial

---

## 🐛 Rollback (si es necesario)

```bash
npx prisma migrate resolve --rolled-back restructure_clients_pricing
```

---

**Fecha de creación:** 2026-04-26  
**Estado:** Listo para aplicar en BD
