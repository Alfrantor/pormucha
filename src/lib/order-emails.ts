import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = "Equipo Pormucha <ventas@pormuchakombucha.com>";

type LineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

function money(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function emailShell(title: string, greeting: string, body: string) {
  return `
    <div style="background:#f4f1e9;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
      <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e9e4d9;border-radius:24px;overflow:hidden;">
        <div style="background:#1a1a1a;padding:28px 24px;text-align:center;">
          <img src="https://pormuchakombucha.com/logo-white.png" alt="Pormucha" style="width:140px;height:auto;" />
        </div>
        <div style="padding:36px 28px;">
          <p style="margin:0 0 12px;color:#8B3A18;font-size:12px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;">${title}</p>
          <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2;">${greeting}</h1>
          ${body}
        </div>
        <div style="padding:20px 28px;background:#faf8f2;border-top:1px solid #eee;text-align:center;color:#7a7a7a;font-size:12px;">
          Este es un correo automático de Pormucha Kombucha.
        </div>
      </div>
    </div>
  `;
}

function renderItems(items: LineItem[]) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;">${item.name}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;text-align:right;">${money(item.unitPrice)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;text-align:right;font-weight:700;">${money(item.subtotal)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:18px 0 22px;">
      <thead>
        <tr>
          <th style="padding:0 0 10px;text-align:left;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.12em;">Producto</th>
          <th style="padding:0 0 10px;text-align:center;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.12em;">Cant.</th>
          <th style="padding:0 0 10px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.12em;">Precio</th>
          <th style="padding:0 0 10px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.12em;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export async function sendPurchaseConfirmationEmail(params: {
  to?: string | null;
  name?: string | null;
  orderNumber: string;
  total: number;
  shippingCost?: number;
  items: LineItem[];
  shippingProvider?: string | null;
}) {
  if (!resend || !params.to) return { success: false, reason: "missing_email" as const };

  const body = `
    <p style="font-size:16px;line-height:1.7;color:#555;margin:0 0 18px;">
      Gracias por tu compra. Ya recibimos tu pedido y comenzaremos a prepararlo en cuanto se confirme el pago.
    </p>
    <div style="background:#f9f7f0;border:1px solid #ece4d4;border-radius:18px;padding:18px 18px 8px;margin-bottom:22px;">
      <p style="margin:0 0 8px;font-size:14px;"><strong>Pedido:</strong> ${params.orderNumber}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Total:</strong> ${money(params.total)}</p>
      ${params.shippingCost ? `<p style="margin:0 0 8px;font-size:14px;"><strong>Envío:</strong> ${money(params.shippingCost)}${params.shippingProvider ? ` (${params.shippingProvider})` : ""}</p>` : ""}
    </div>
    ${renderItems(params.items)}
    <p style="font-size:15px;line-height:1.7;color:#555;margin:0;">
      Si necesitas hacer un ajuste o tienes alguna duda, responde a este correo y con gusto te ayudamos.
    </p>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `Gracias por tu compra - Pedido ${params.orderNumber}`,
    html: emailShell("Compra confirmada", `¡Gracias${params.name ? `, ${params.name}` : ""}!`, body),
  });

  return { success: true };
}

export async function sendSubscriptionConfirmationEmail(params: {
  to?: string | null;
  name?: string | null;
  planName: string;
  unitCount: number;
  nextShipmentDate?: Date | null;
}) {
  if (!resend || !params.to) return { success: false, reason: "missing_email" as const };

  const shipmentText = params.nextShipmentDate
    ? params.nextShipmentDate.toLocaleDateString("es-MX")
    : "pronto";

  const body = `
    <p style="font-size:16px;line-height:1.7;color:#555;margin:0 0 18px;">
      Tu suscripción quedó activa y ya estamos preparando tu surtido recurrente.
    </p>
    <div style="background:#f9f7f0;border:1px solid #ece4d4;border-radius:18px;padding:18px 18px 8px;margin-bottom:22px;">
      <p style="margin:0 0 8px;font-size:14px;"><strong>Plan:</strong> ${params.planName}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Botellas por envío:</strong> ${params.unitCount}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Próximo envío:</strong> ${shipmentText}</p>
    </div>
    <p style="font-size:15px;line-height:1.7;color:#555;margin:0;">
      Podrás revisar tu suscripción, cambiar sabores y administrar tus datos desde tu panel de cliente.
    </p>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `Tu suscripción Club Pormucha está activa`,
    html: emailShell("Suscripción activa", `¡Bienvenido${params.name ? `, ${params.name}` : ""}!`, body),
  });

  return { success: true };
}
