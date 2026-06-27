import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendLowStockEmail(
  productName: string,
  quantity: number,
  threshold: number
): Promise<void> {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'notifications@resend.dev',
      to: process.env.ALERT_EMAIL!,
      subject: `⚠️ Low Stock Alert — ${productName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #f59e0b;">⚠️ Low Stock Alert</h2>
          <p>A product in your AGORA inventory has fallen below the stock threshold.</p>
          <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
            <tr style="background:#f1f5f9;">
              <td style="padding:10px; font-weight:600;">Product</td>
              <td style="padding:10px;">${productName}</td>
            </tr>
            <tr>
              <td style="padding:10px; font-weight:600;">Current Stock</td>
              <td style="padding:10px; color:#f87171; font-weight:700;">${quantity} units</td>
            </tr>
            <tr style="background:#f1f5f9;">
              <td style="padding:10px; font-weight:600;">Threshold</td>
              <td style="padding:10px;">${threshold} units</td>
            </tr>
          </table>
          <p style="margin-top:24px; color:#64748b; font-size:13px;">
            Please restock this item as soon as possible to avoid disruption.
          </p>
          <p style="color:#64748b; font-size:12px;">— AGORA Inventory POS System</p>
        </div>
      `,
    })
    console.log(`[Email] Low stock alert sent for ${productName}`)
  } catch (err) {
    console.error('[Email] Failed to send alert:', err)
  }
}