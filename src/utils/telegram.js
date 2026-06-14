// Sends order info to your Telegram group via the Bot API
// Bot token and chat ID come from environment variables

const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN;
const CHAT_ID = import.meta.env.VITE_ORDER_CHAT_ID;

async function tgPost(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.description || `Telegram ${method} error`);
  }
  return res.json();
}

export async function sendOrderToTelegram(orderData) {
  const { user, cart, delivery, courier, address, location, payment, notes, discount, total, preferredDate } = orderData;

  const cartLines = cart.map(item =>
    `  • ${item.name}${item.emoji ? ' ' + item.emoji : ''}${item.strain ? ` [${item.strain}]` : ''} — ${item.grams}g`
  ).join('\n');

  const addressLines = address
    ? Object.entries(address).filter(([, v]) => v).map(([k, v]) => `  ${k}: ${v}`).join('\n')
    : null;

  const message = `
🛒 <b>NUOVO ORDINE — therawller</b>

👤 <b>Cliente:</b>
  Nome: ${user?.first_name || ''} ${user?.last_name || ''}
  Username: @${user?.username || 'N/A'}
  ID: <code>${user?.id || 'N/A'}</code>

📦 <b>Prodotti:</b>
${cartLines}

🚚 <b>Consegna:</b> ${delivery}${courier ? ` (${courier})` : ''}
${location ? `📍 <b>Posizione GPS:</b> <a href="https://maps.google.com/?q=${location.lat},${location.lng}">Apri su Google Maps</a>` : ''}
${addressLines ? `📍 <b>Indirizzo:</b>\n${addressLines}` : ''}
${preferredDate ? `📅 <b>Data preferita:</b> ${preferredDate}` : ''}

💳 <b>Pagamento:</b> ${payment}
${discount ? `🏷️ <b>Codice sconto:</b> ${discount}` : ''}
${notes ? `📝 <b>Note:</b> ${notes}` : ''}

💰 <b>TOTALE: €${total}</b>
`.trim();

  // 1. Send text order summary
  await tgPost('sendMessage', {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML',
  });

  // 2. If delivery with GPS — send native Telegram map pin right after
  if (location?.lat && location?.lng) {
    await tgPost('sendLocation', {
      chat_id: CHAT_ID,
      latitude: location.lat,
      longitude: location.lng,
    });
  }

  return true;
}

