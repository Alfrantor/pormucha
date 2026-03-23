// Utilidad para generar e imprimir ticket térmico (80mm)
// Genera HTML en una ventana nueva y dispara window.print()

interface TicketItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface TicketData {
  locationName: string;
  items: TicketItem[];
  total: number;
  paymentMethod: string; // "CASH" | "CARD"
  vendedor: string;
  fecha: Date;
}

const formatMoney = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function printTicket(data: TicketData) {
  const { locationName, items, total, paymentMethod, vendedor, fecha } = data;

  const fechaStr = fecha.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const horaStr = fecha.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const metodoPago = paymentMethod === "CASH" ? "EFECTIVO" : "TARJETA";

  // Generar filas de items
  const itemsHTML = items
    .map(
      (item) => `
      <tr>
        <td style="text-align:left; padding: 2px 0;">
          ${item.name}
          <br/>
          <span style="font-size:10px; color:#666;">
            ${item.quantity} x $${formatMoney(item.price)}
          </span>
        </td>
        <td style="text-align:right; padding: 2px 0; white-space:nowrap;">
          $${formatMoney(item.subtotal)}
        </td>
      </tr>`
    )
    .join("");

  const ticketHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket de Venta</title>
  <style>
    @page {
      margin: 0;
      size: 80mm auto;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      width: 80mm;
      padding: 8px;
      color: #000;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header h1 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 2px;
      letter-spacing: 1px;
    }
    .header h2 {
      font-size: 11px;
      font-weight: normal;
      color: #444;
    }
    .info {
      font-size: 11px;
      margin-bottom: 8px;
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
    }
    .info p {
      margin: 2px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .items-table th {
      text-align: left;
      font-size: 11px;
      border-bottom: 1px solid #000;
      padding: 4px 0;
    }
    .items-table th:last-child {
      text-align: right;
    }
    .separator {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .total-section {
      border-top: 2px solid #000;
      padding-top: 6px;
      margin-top: 4px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: bold;
      padding: 4px 0;
    }
    .payment-method {
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      margin: 8px 0;
      padding: 4px;
      border: 1px solid #000;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      margin-top: 12px;
      border-top: 1px dashed #000;
      padding-top: 8px;
      color: #444;
    }
    .footer p {
      margin: 2px 0;
    }
    @media print {
      body {
        width: 80mm;
      }
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <h1>PORMUCHA</h1>
    <h2>Kombucha Artesanal</h2>
  </div>

  <!-- INFO DE VENTA -->
  <div class="info">
    <p><strong>Sucursal:</strong> ${locationName}</p>
    <p><strong>Fecha:</strong> ${fechaStr}</p>
    <p><strong>Hora:</strong> ${horaStr}</p>
    <p><strong>Vendedor:</strong> ${vendedor}</p>
  </div>

  <!-- ITEMS -->
  <table class="items-table">
    <thead>
      <tr>
        <th>Producto</th>
        <th>Importe</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <!-- TOTAL -->
  <div class="total-section">
    <div class="total-row">
      <span>TOTAL</span>
      <span>$${formatMoney(total)}</span>
    </div>
  </div>

  <!-- MÉTODO DE PAGO -->
  <div class="payment-method">
    Pago: ${metodoPago}
  </div>

  <!-- PIE -->
  <div class="footer">
    <p>¡Gracias por tu compra!</p>
    <p>pormucha.com</p>
    <p style="margin-top:6px; font-size:9px;">Este ticket es tu comprobante de compra</p>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  // Abrir ventana nueva con el ticket
  const printWindow = window.open("", "_blank", "width=320,height=600");
  if (printWindow) {
    printWindow.document.write(ticketHTML);
    printWindow.document.close();
  }
}

// Versión para reimprimir desde el historial de ventas
export function reprintTicket(sale: {
  locationName: string;
  items: { productName: string; quantity: number; price: number; subtotal: number }[];
  total: number;
  paymentMethod: string;
  userId: string | null;
  createdAt: string;
}) {
  printTicket({
    locationName: sale.locationName,
    items: sale.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    })),
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    vendedor: sale.userId || "N/A",
    fecha: new Date(sale.createdAt),
  });
}
