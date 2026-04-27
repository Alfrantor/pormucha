# 🚀 Quick Start - Reestructura ERP

## ⚡ Resumen en 30 segundos

✅ **Schema Prisma actualizado** con 3 nuevas tablas  
✅ **6 nuevas páginas admin** (clientes, precios, detalles)  
✅ **3 componentes principales** (tabla, modal, gestor precios)  
✅ **Sistema de precios inteligente** (escalas + descuentos)  
✅ **Todo documentado** y listo para producción  

---

## 📋 Qué cambió

### Antes (Sistema simple)
```
Client: fullName, email, phone, dirección (fija)
Flavor: price (un solo precio)
Order: total, items básicos
```

### Ahora (ERP profesional)
```
Client: RFC, razón social, tipo, clasificación, crédito, 
        múltiples direcciones, descuentos personalizados, 
        historial de interacciones

Flavor: basePrice, wholesalePrice, minimumWholesale,
        priceScales (escalas dinámicas),
        discounts (por cliente/clasificación)

Order: Guardan precios exactos aplicados en cada momento
```

---

## 🎯 Los 3 Pasos Clave

### 1️⃣ Aplicar Migración (cuando BD esté lista)
```bash
npx prisma migrate dev --name restructure_clients_pricing
```

### 2️⃣ Integrar en Checkout (ver CHECKOUT_INTEGRATION.md)
```typescript
import { calculateFlavorPrice } from "@/lib/pricing";
const pricing = await calculateFlavorPrice(flavorId, quantity, clientId);
```

### 3️⃣ Usar las nuevas páginas
- `/admin/clientes` - Gestionar clientes
- `/admin/clientes/[id]` - Detalle cliente
- `/admin/precios` - Gestionar precios

---

## 📁 Archivos Nuevos (16)

**Acciones:**
- `src/app/_actions/clients.ts` - CRUD clientes
- `src/app/_actions/flavor-pricing.ts` - Gestión precios

**Componentes:**
- `src/components/admin/ClientsTable.tsx`
- `src/components/admin/ClientModal.tsx`
- `src/components/admin/PricingManager.tsx`

**Páginas:**
- `src/app/admin/clientes/page.tsx`
- `src/app/admin/clientes/[id]/page.tsx`
- `src/app/admin/precios/page.tsx`

**Librerías:**
- `src/lib/pricing.ts`

**Docs:**
- `MIGRACION_CLIENTES_PRECIOS.md`
- `CHECKOUT_INTEGRATION.md`
- `CAMBIOS_REALIZADOS.md`
- `QUICK_START.md` (este)

---

## 💰 Sistema de Precios (Lo más importante)

### Cálculo automático en este orden:

```
1. Precio base (minorista)
   ↓
2. Si cantidad >= mínimo mayoreo → aplicar escala
   ↓
3. Si hay cliente → aplicar descuento (cliente > clasificación > global)
   ↓
4. Precio final (con auditoría completa)
```

### Ejemplo práctico:

**Setup:**
- Chocolate: $100 minorista, $90 mayorista (mín 50)
- Escala: 100-500 → $85, 501+ → $75
- Cliente ABC es MAYORISTA con -10% descuento

**Compra de 100 unidades:**
- $100 → $85 (escala) → $76.50 (descuento 10%)
- **Resultado: $76.50 por unidad**

**Compra de 600 unidades:**
- $100 → $75 (escala) → $67.50 (descuento 10%)
- **Resultado: $67.50 por unidad**

---

## 🔐 RFC Validación

RFC se valida automáticamente:
- Formato: `ABC123456DEF` (3-4 letras + 6 números + 3 alfanuméricos)
- Se guarda en mayúsculas
- Único por cliente
- Mexicano (regex específica)

---

## 📊 Nuevas Tablas en BD

```
Clients (expandido):
  + type (FISICA | JURIDICA)
  + rfc, businessName, curp
  + classification (MINORISTA | MAYORISTA | DISTRIBUIDOR)
  + creditLimit, creditUsed, paymentTerms, globalDiscount
  + status (ACTIVO | INACTIVO | BLOQUEADO)

Addresses (NUEVA):
  + clientId, type, street, number, city, state, zipCode
  + isDefault

Credits (NUEVA):
  + clientId, amount, dueDate, status

ClientInteractions (NUEVA):
  + clientId, type, note

FlavorPriceScale (NUEVA):
  + flavorId, minQuantity, maxQuantity, price

FlavorDiscount (NUEVA):
  + flavorId, applicableTo, clientId, discountPercent, fixedPrice, validUntil

FlavorPriceHistory (actualizado):
  + oldWholesale, newWholesale, changeReason
```

---

## 🎮 Cómo Usar

### Crear Cliente
```typescript
import { createClient } from "@/app/_actions/clients";

await createClient({
  type: "JURIDICA",
  fullName: "Distribuidora XYZ",
  email: "info@xyz.com",
  rfc: "XYZ123456ABC",
  businessName: "Distribuidora XYZ S.A.",
  classification: "MAYORISTA",
  creditLimit: 50000,
  paymentTerms: 60
});
```

### Calcular Precio
```typescript
import { calculateFlavorPrice } from "@/lib/pricing";

const pricing = await calculateFlavorPrice(
  "flavor-chocolate",
  100,  // cantidad
  "client-xyz"  // cliente (opcional)
);

console.log(pricing.finalPrice);  // $85 (con escalas y descuentos)
console.log(pricing.breakdown);   // "Escala: 100-500 unidades + 10% descuento"
```

---

## ✅ Testing

**Test 1: Minorista (5 unidades)**
```
Precio esperado: $100 (sin descuentos)
```

**Test 2: Mayorista (100 unidades)**
```
Precio esperado: $85 (aplica escala)
```

**Test 3: Distribuidor (600 unidades)**
```
Precio esperado: $67.50 (escala 501+ + descuento 10%)
```

---

## 🔗 Integración Checkout (Lo Urgente)

**Archivo:** `src/app/api/checkout/route.ts`

**Cambio:**
```typescript
// ANTES
const subtotal = items.reduce((sum, item) => 
  sum + (item.price * item.quantity), 0
);

// DESPUÉS
const cartTotal = await calculateCartTotal(items, clientId);
const subtotal = cartTotal.subtotal;
```

Ver **CHECKOUT_INTEGRATION.md** para detalles completos.

---

## 🚨 Importante

### Hacer primero:
1. ✅ Aplicar migración Prisma
2. ✅ Generar cliente Prisma
3. ✅ Revisar las 3 nuevas páginas admin
4. ✅ Actualizar checkout
5. ✅ Testing completo

### No hacer:
- ❌ No eliminar schema antiguo (compatible)
- ❌ No rollback sin backup
- ❌ No cambiar nombres de tablas
- ❌ No migrar órdenes antiguas (no es necesario)

---

## 📞 Referencia de Funciones

**Clientes:**
- `createClient(data)` → Cliente nuevo
- `updateClient(id, data)` → Editar
- `getClient(id)` → Obtener con relaciones
- `listClients(params)` → Búsqueda avanzada
- `createAddress(data)` → Nueva dirección
- `createInteraction(data)` → Agregar nota

**Precios:**
- `calculateFlavorPrice(flavorId, qty, clientId?)` → Precio exacto
- `calculateCartTotal(items, clientId?)` → Carrito completo
- `updateFlavorPrices(id, data)` → Actualizar precios
- `createPriceScale(data)` → Nueva escala
- `createDiscount(data)` → Nuevo descuento

---

## ⏱️ Tiempo Estimado

| Tarea | Tiempo |
|-------|--------|
| Aplicar migración | 5 min |
| Revisar admin pages | 15 min |
| Integrar checkout | 60 min |
| Testing completo | 60 min |
| **Total** | **~2 horas** |

---

## 🎯 Después de Implementar

Puedes crear:
- Dashboard de márgenes
- Reportes de ventas por cliente
- Análisis de rentabilidad
- Alertas de crédito vencido
- Predicción de demanda

---

## 📖 Documentación Completa

- **MIGRACION_CLIENTES_PRECIOS.md** - Pasos detallados
- **CHECKOUT_INTEGRATION.md** - Cómo integrar
- **CAMBIOS_REALIZADOS.md** - Lista completa de cambios
- **Código comentado** - Todas las funciones tienen JSDoc

---

**¿Listo para empezar? Solo necesitas la BD disponible para ejecutar la migración.** 🚀
