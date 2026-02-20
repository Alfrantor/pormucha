import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || ""
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, shippingCost, customerAddress } = body;

    // VALIDACIÓN 1: Carrito vacío
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }

    // VALIDACIÓN 2: Dirección faltante
    if (!customerAddress) {
      return NextResponse.json({ error: "Faltan datos de envío" }, { status: 400 });
    }

    const preference = await new Preference(client).create({
      body: {
        items: items.map((item: any) => ({
          id: item.id,
          title: item.name,
          unit_price: Number(Number(item.price).toFixed(2)),
          quantity: 1,
          currency_id: 'MXN'
        })),
        shipments: {
          cost: Number(Number(shippingCost).toFixed(2)),
          mode: "not_specified",
        },
        payer: {
          name: customerAddress.name,
          email: customerAddress.email,
          phone: { number: String(customerAddress.phone) },
          address: {
            zip_code: String(customerAddress.zip),
            street_name: `${customerAddress.street}, Col. ${customerAddress.neighborhood}`,

          }
        },
        // --- CAMBIO AQUÍ: URLs ESCRITAS DIRECTAMENTE ---
        // Esto elimina cualquier error de variables "undefined"
        back_urls: {
          success: "http://localhost:3000/success",
          failure: "http://localhost:3000/checkout",
          pending: "http://localhost:3000/checkout",
        },
        // auto_return: "approved",
        external_reference: `order-${Date.now()}`,
      }
    });

    return NextResponse.json({ id: preference.id });
  } catch (error: any) {
    console.error("Error Mercado Pago:", error);
    return NextResponse.json({
      error: "Error al crear el pago",
      details: error.cause || error.message
    }, { status: 500 });
  }
}