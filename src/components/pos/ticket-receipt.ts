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
  subtotal?: number;
  serviceFee?: number;
  total: number;
  paymentMethod: string; // "CASH" | "CARD"
  vendedor: string;
  fecha: Date;
}

const formatMoney = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function printTicket(data: TicketData) {
  const { locationName, items, subtotal, serviceFee = 0, total, paymentMethod, vendedor, fecha } = data;

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

  const metodoPago = paymentMethod === "CASH" ? "EFECTIVO" : paymentMethod === "CARD" ? "TARJETA" : paymentMethod;

  // Generar filas de items
  const itemsHTML = items
    .map(
      (item) => `
      <tr>
        <td style="text-align:left; padding: 4px 0;">
          <strong>${item.name}</strong><br/>
          <span style="font-size:13px;">
            ${item.quantity} x $${formatMoney(item.price)}
          </span>
        </td>
        <td style="text-align:right; padding: 4px 0; white-space:nowrap; font-size:15px;">
          <strong>$${formatMoney(item.subtotal)}</strong>
        </td>
      </tr>`
    )
    .join("");

  // Línea de servicio (solo si aplica)
  const serviceFeeHTML = serviceFee > 0 ? `
    <div class="total-row subtotal-row">
      <span>SUBTOTAL</span>
      <span>$${formatMoney(subtotal ?? (total - serviceFee))}</span>
    </div>
    <div class="total-row subtotal-row">
      <span>SERVICIO</span>
      <span>$${formatMoney(serviceFee)}</span>
    </div>` : "";

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
      font-weight: bold;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 15px;
      font-weight: bold;
      width: 80mm;
      padding: 8px;
      color: #000;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 3px;
      letter-spacing: 2px;
    }
    .header h2 {
      font-size: 15px;
      font-weight: bold;
    }
    .info {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      border-bottom: 2px dashed #000;
      padding-bottom: 10px;
    }
    .info p {
      margin: 3px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 15px;
    }
    .items-table th {
      text-align: left;
      font-size: 13px;
      font-weight: bold;
      border-bottom: 2px solid #000;
      padding: 5px 0;
    }
    .items-table th:last-child {
      text-align: right;
    }
    .separator {
      border-top: 2px dashed #000;
      margin: 8px 0;
    }
    .total-section {
      border-top: 3px solid #000;
      padding-top: 8px;
      margin-top: 6px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 20px;
      font-weight: bold;
      padding: 4px 0;
    }
    .subtotal-row {
      font-size: 14px;
      color: #333;
      padding: 2px 0;
      border-bottom: 1px dashed #aaa;
      margin-bottom: 2px;
    }
    .total-final {
      font-size: 22px;
      font-weight: bold;
      padding-top: 6px;
    }
    .payment-method {
      text-align: center;
      font-size: 17px;
      font-weight: bold;
      margin: 10px 0;
      padding: 6px;
      border: 2px solid #000;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      margin-top: 12px;
      border-top: 2px dashed #000;
      padding-top: 10px;
    }
    .footer p {
      margin: 3px 0;
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
    <p>Sucursal: ${locationName}</p>
    <p>Fecha: ${fechaStr}</p>
    <p>Hora: ${horaStr}</p>
    <p>Vendedor: ${vendedor}</p>
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
    ${serviceFeeHTML}
    <div class="total-row total-final">
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
    <p>Jaime G Ruiz Herrera</p>
    <p>Av. Resurgimiento No. 62, Col. Prado,</p>
    <p>C.P. 24030, Campeche, Campeche</p>
    <p>RFC: RUHJ9008251CA</p>
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
  subtotal?: number;
  serviceFee?: number;
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
    subtotal: sale.subtotal,
    serviceFee: sale.serviceFee ?? 0,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    vendedor: sale.userId || "N/A",
    fecha: new Date(sale.createdAt),
  });
}
