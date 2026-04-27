# Integración del Nuevo Sistema de Precios en Checkout

## 📋 Resumen

El checkout actual usa precios simples. Con la nueva estructura, debe recalcular dinámicamente basado en:
- Cantidad de items
- Clasificación del cliente
- Descuentos personalizados

## 🔄 Flujo de Actualización

### Paso 1: Importar la función de cálculo

```typescript
import { calculateFlavorPrice, calculateCartTotal } from "@/lib/pricing";
```

### Paso 2: Ejemplo - Carrito Web

**Antes (viejo):**
```typescript
const subtotal = items.reduce((sum, item) => 
  sum + (Number(item.price) * item.quantity), 0
);
```

**Después (nuevo):**
```typescript
// 1. Si es carrito anónimo (sin cliente)
const cartTotal = await calculateCartTotal(
  items.map(item => ({ 
    flavorId: item.flavorId, 
    quantity: item.quantity 
  }))
);

// 2. Si es cliente logueado
const clientId = await getClientIdFromUser(userId);
const cartTotal = await calculateCartTotal(
  items.map(item => ({ 
    flavorId: item.flavorId, 
    quantity: item.quantity 
  })),
  clientId
);

const subtotal = cartTotal.subtotal;
```

### Paso 3: En el API de Checkout

**Archivo: `src/app/api/checkout/route.ts`**

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const { items, clientId } = body;

  // Calcular precios con nuevo sistema
  const cartTotal = await calculateCartTotal(
    items.map((item: any) => ({
      flavorId: item.flavorId,
      quantity: item.quantity,
    })),
    clientId
  );

  // Crear sesión de Stripe con precios actualizados
  const lineItems = await Promise.all(
    cartTotal.items.map(async (item) => {
      const flavor = await db.flavor.findUnique({
        where: { id: item.flavorId },
        select: { name: true, image: true },
      });

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: flavor?.name,
            images: flavor?.image ? [flavor.image] : [],
          },
          unit_amount: Math.round(item.unitPrice * 100), // unitPrice ya contiene descuentos
        },
        quantity: item.quantity,
      };
    })
  );

  // Crear sesión de pago
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_URL}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/checkout`,
  });

  return Response.json({ sessionId: session.id });
}
```

### Paso 4: Guardar Detalles de Precio en Orden

**Cuando se crea la orden:**

```typescript
// Guardar precios desglosados
const order = await db.order.create({
  data: {
    clientId,
    subtotal: new Decimal(cartTotal.subtotal),
    total: new Decimal(cartTotal.total),
    orderItems: {
      create: cartTotal.items.map((item) => ({
        flavorId: item.flavorId,
        productName: flavor.name,
        quantity: item.quantity,
        unitPrice: new Decimal(item.unitPrice),
        subtotal: new Decimal(item.subtotal),
      })),
    },
  },
});
```

---

## 🛒 Casos de Uso Completos

### Caso 1: Cliente Minorista Anónimo

```typescript
// Usuario sin login, compra 10 unidades de Chocolate
const pricing = await calculateFlavorPrice("flavor-chocolate", 10);
// Resultado:
// basePrice: 100
// finalPrice: 100 (sin descuentos)
// breakdown: "Precio minorista"
```

### Caso 2: Cliente Mayorista Registrado

```typescript
// Cliente clasificado como MAYORISTA, compra 100 unidades
const pricing = await calculateFlavorPrice(
  "flavor-chocolate", 
  100, 
  "client-123"
);
// Resultado (suponiendo los datos del ejemplo anterior):
// basePrice: 100
// finalPrice: 85 (aplica escala 50-100)
// breakdown: "Escala: 50-100 unidades"
```

### Caso 3: Cliente Distribuidor con Descuento Especial

```typescript
// Cliente es DISTRIBUIDOR con descuento especial, compra 500 unidades
const pricing = await calculateFlavorPrice(
  "flavor-chocolate", 
  500, 
  "client-distribuidor"
);
// Resultado (si tiene descuento especial 15%):
// basePrice: 100
// finalPrice: 63.75 (escala 501+ de $75 × 85% descuento)
// breakdown: "Escala: 501-∞ unidades + 15% descuento especial"
```

### Caso 4: Carrito Completo

```typescript
const cartTotal = await calculateCartTotal(
  [
    { flavorId: "chocolate", quantity: 100 },
    { flavorId: "vainilla", quantity: 75 },
    { flavorId: "fresa", quantity: 50 },
  ],
  "client-mayorista"
);
// Resultado:
// {
//   items: [
//     { flavorId, quantity, unitPrice: 85, subtotal: 8500 },
//     { flavorId, quantity, unitPrice: 90, subtotal: 6750 },
//     { flavorId, quantity, unitPrice: 92, subtotal: 4600 },
//   ],
//   subtotal: 19850,
//   total: 19850
// }
```

---

## 📊 Cambios en Base de Datos

Cuando se crea una orden, ahora se guarda:

```typescript
OrderItem {
  id: "oi-123"
  orderId: "order-123"
  flavorId: "flavor-chocolate"
  productName: "Chocolate"
  quantity: 100
  unitPrice: 85.00  // Precio final con todos los descuentos
  subtotal: 8500.00  // quantity × unitPrice
}
```

**Ventajas:**
- ✅ Audit trail completo (qué pagó cada cliente por cada item)
- ✅ No se ve afectado si cambias precios después
- ✅ Puedes analizar márgenes por cliente/clasificación
- ✅ Detección de anomalías en precios

---

## 🔔 Consideraciones de POS

Para el POS (punto de venta), es similar:

```typescript
// src/app/api/pos/checkout/route.ts
export async function POST(request: Request) {
  const { items, clientId } = await request.json();

  // Mismo cálculo de precios
  const cartTotal = await calculateCartTotal(items, clientId);

  // Crear orden
  const order = await db.order.create({
    data: {
      channel: "POS",
      clientId,
      subtotal: new Decimal(cartTotal.subtotal),
      total: new Decimal(cartTotal.total),
      status: "COMPLETED", // POS es inmediato
      // ... resto de datos
    },
  });

  return Response.json(order);
}
```

---

## 💾 Migración de Órdenes Antiguas

Si tienes órdenes existentes sin el nuevo sistema:

```typescript
// Script de migración (ejecutar una sola vez)
const oldOrders = await db.order.findMany({
  where: { subtotal: null }, // Órdenes antiguas sin subtotal
});

for (const order of oldOrders) {
  const subtotal = await recalculateOrderSubtotal(order.id);
  await db.order.update({
    where: { id: order.id },
    data: { subtotal, total: subtotal },
  });
}
```

---

## ✅ Checklist de Implementación

- [ ] Actualizar `src/app/api/checkout/route.ts`
- [ ] Actualizar `src/app/api/pos/checkout/route.ts`
- [ ] Actualizar componente de carrito (mostrar precios actualizados)
- [ ] Agregar validaciones de cliente logueado
- [ ] Probar con cliente minorista
- [ ] Probar con cliente mayorista
- [ ] Probar con cliente distribuidor
- [ ] Verificar historial de órdenes
- [ ] Migrar órdenes antiguas (si aplica)

---

## 🧪 Testing

### Test 1: Precio Minorista
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"flavorId": "flavor-1", "quantity": 5}]
  }'
# Debe retornar precio base sin descuentos
```

### Test 2: Precio Mayorista Escalado
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"flavorId": "flavor-1", "quantity": 100}],
    "clientId": "mayorista-1"
  }'
# Debe retornar con escala de precios aplicada
```

---

## 🎯 Próximos Pasos

1. **Corto plazo**: Integrar en checkout web y POS
2. **Mediano plazo**: Dashboard de análisis de márgenes por cliente
3. **Largo plazo**: Predicción de demanda basada en historial de precios
