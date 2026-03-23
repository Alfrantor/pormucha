import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// URLs de Skydropx PRO (la API antigua api.skydropx.com ya no funciona)
const SKYDROPX_URLS = [
  "https://pro.skydropx.com/api/v1/oauth/token",      // Producción PRO
  "https://sb-pro.skydropx.com/api/v1/oauth/token",    // Sandbox PRO
];

async function tryGetToken(url: string): Promise<string | null> {
  console.log(`📡 Intentando obtener token de: ${url}`);

  // Intentar con application/json (como indica la documentación)
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.SKYDROPX_CLIENT_ID,
      client_secret: process.env.SKYDROPX_CLIENT_SECRET,
    }),
  });

  const text = await response.text();
  console.log(`   Status: ${response.status} | Body: ${text.substring(0, 200)}`);

  if (response.ok) {
    const data = JSON.parse(text);
    console.log("✨ ¡CONEXIÓN EXITOSA! ✨");
    return data.access_token;
  }

  // Si JSON falla, intentar con form-urlencoded
  console.log(`   ↳ JSON falló, intentando form-urlencoded...`);
  const formBody = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.SKYDROPX_CLIENT_ID || "",
    client_secret: process.env.SKYDROPX_CLIENT_SECRET || "",
  });

  const formResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: formBody.toString(),
  });

  const formText = await formResponse.text();
  console.log(`   Status (form): ${formResponse.status} | Body: ${formText.substring(0, 200)}`);

  if (formResponse.ok) {
    const data = JSON.parse(formText);
    console.log("✨ ¡CONEXIÓN EXITOSA (form-urlencoded)! ✨");
    return data.access_token;
  }

  return null;
}

async function getSkydropxToken(): Promise<string> {
  for (const url of SKYDROPX_URLS) {
    const token = await tryGetToken(url);
    if (token) return token;
    console.error(`❌ Fallo en ${url}`);
  }

  throw new Error(
    "No se pudo obtener token de Skydropx. " +
    "Verifica tus credenciales en: Skydropx PRO → Conexiones → API"
  );
}

export async function POST(request: Request) {
  try {
    const { zip, productIds } = await request.json();

    // 1. Obtener el Bearer Token dinámico
    console.log("🔑 Solicitando token de acceso OAuth2...");
    const bearerToken = await getSkydropxToken();

    // 2. Buscar las dimensiones reales de los productos del carrito
    let totalWeight = 1;
    let maxHeight = 10;
    let maxWidth = 10;
    let maxLength = 10;

    if (productIds && productIds.length > 0) {
      const products = await db.product.findMany({
        where: { id: { in: productIds } }
      });

      if (products.length > 0) {
        // Sumar pesos y usar dimensiones máximas
        totalWeight = products.reduce((sum, p) => sum + Number(p.weight), 0);
        maxHeight = Math.max(...products.map(p => Number(p.height)));
        maxWidth = Math.max(...products.map(p => Number(p.width)));
        maxLength = Math.max(...products.map(p => Number(p.length)));
      }

      console.log(`📐 Dimensiones del paquete: ${totalWeight}kg, ${maxHeight}x${maxWidth}x${maxLength}cm`);
    }

    // 3. Cotizar usando el formato de la API PRO
    console.log(`📦 Cotizando envío para CP: ${zip}`);

    const quotationBody = {
      quotation: {
        address_from: {
          country_code: "MX",
          postal_code: "24000",
          area_level1: "Campeche",
          area_level2: "San Francisco de Campeche",
          area_level3: "Centro",
        },
        address_to: {
          country_code: "MX",
          postal_code: zip,
          area_level1: "Destino",
          area_level2: "Destino",
          area_level3: "Centro",
        },
        parcels: [
          {
            weight: totalWeight,
            height: maxHeight,
            width: maxWidth,
            length: maxLength,
          }
        ],
      },
    };

    const response = await fetch("https://pro.skydropx.com/api/v1/quotations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(quotationBody),
    });

    let data = await response.json();

    if (!response.ok) {
      console.error("❌ Error en cotización:", data);
      return NextResponse.json({ error: "Error de paquetería" }, { status: response.status });
    }

    const quotationId = data.id;
    console.log(`📬 Cotización creada: ${quotationId}`);

    // 3. La API PRO es ASÍNCRONA: las tarifas comienzan en "pending"
    //    Necesitamos hacer polling hasta que estén listas
    let successfulRates: any[] = [];
    const MAX_POLLS = 5;
    const POLL_DELAY_MS = 1500;

    for (let attempt = 0; attempt <= MAX_POLLS; attempt++) {
      const allRates = data.rates || [];
      successfulRates = allRates.filter(
        (r: any) => r.success === true && r.total != null
      );

      console.log(`⏳ Intento ${attempt}: ${successfulRates.length} tarifas listas de ${allRates.length} totales`);

      // Si ya hay tarifas exitosas, salimos del loop
      if (successfulRates.length > 0) break;

      // Si ya se completó y no hay tarifas, no tiene sentido seguir
      if (data.is_completed && successfulRates.length === 0 && attempt > 0) {
        console.log("⚠️ Cotización completada pero sin tarifas exitosas");
        break;
      }

      // Si es el último intento, no esperar más
      if (attempt === MAX_POLLS) break;

      // Esperar antes de hacer polling
      await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));

      // Consultar el estado actualizado de la cotización
      console.log(`🔄 Polling cotización ${quotationId}...`);
      const pollResponse = await fetch(
        `https://pro.skydropx.com/api/v1/quotations/${quotationId}`,
        {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${bearerToken}`,
          },
        }
      );

      if (pollResponse.ok) {
        data = await pollResponse.json();
      } else {
        console.error(`❌ Error en polling: ${pollResponse.status}`);
        break;
      }
    }

    console.log(`✅ ${successfulRates.length} tarifas disponibles`);

    if (successfulRates.length > 0) {
      // Ordenar por precio de menor a mayor
      successfulRates.sort((a: any, b: any) => Number(a.total) - Number(b.total));

      // Extraemos tarifas formateadas
      const rates = successfulRates.map((r: any) => ({
        rate: Math.ceil(Number(r.total)),
        provider: `${r.provider_service_name} (${r.provider_display_name})`,
        days: r.days || "3-5",
        id: r.id || Math.random().toString(36).substring(7)
      }));

      console.log(`✅ ${rates.length} tarifas devueltas al cliente`);

      return NextResponse.json({ rates });
    }

    return NextResponse.json({ error: "Sin cobertura para este código postal" }, { status: 404 });

  } catch (error: any) {
    console.error("❌ Error catastrófico:", error.message);
    return NextResponse.json({ error: "Error de conexión" }, { status: 500 });
  }
}