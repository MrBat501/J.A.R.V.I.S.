// Función serverless de Vercel. La dispara el Cron Job de vercel.json todos
// los días (ver LEEME.md). Busca las tareas sin palomita en Supabase y le
// manda una notificación push a cada dispositivo suscrito.

const webPush = require("web-push");

module.exports = async function handler(req, res) {
  // ---- Seguridad: solo Vercel Cron (o el propio Jefe con el secreto) puede disparar esto ----
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers["authorization"] || "";
  const queryToken = (req.query && req.query.secret) || "";
  const isAuthorized =
    !cronSecret || // si no configuraste CRON_SECRET, no lo exigimos (no recomendado)
    authHeader === `Bearer ${cronSecret}` ||
    queryToken === cronSecret;

  if (!isAuthorized) {
    res.status(401).json({ error: "No autorizado." });
    return;
  }

  // Mismos valores públicos que config.js (no son secretos: la clave de
  // Supabase es la "anon key" y la VAPID pública está pensada para viajar
  // en el navegador). Si algún día cambias config.js, actualiza esto igual.
  const SUPABASE_URL = "https://zywnqpouolnyurndhvus.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_PhxTmKC6SatUBQ5of_U4vg_VWfnyxOG";
  const VAPID_PUBLIC_KEY = "BLCqG7hCcG0PNr4h2VISNbShtPaj2Z4pVln2GVDPeuVk2F3KRZsuol5ZvBSK-SaxvdexCOhii0uMbOWmZLwI37Y";

  // Esta sí es secreta: solo vive en Vercel (Settings → Environment Variables).
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:friday@example.com";

  if (!VAPID_PRIVATE_KEY) {
    res.status(500).json({ error: "Falta configurar VAPID_PRIVATE_KEY en las variables de entorno de Vercel." });
    return;
  }

  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  try {
    // ---- 1) Tareas pendientes (sin palomita) ----
    const tasksResp = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?done=eq.false&select=title,date,time&order=date.asc`,
      { headers }
    );
    if (!tasksResp.ok) throw new Error("No se pudieron leer las tareas de Supabase.");
    const pendingTasks = await tasksResp.json();

    if (!pendingTasks.length) {
      res.status(200).json({ ok: true, sent: 0, note: "No hay tareas pendientes, no se mandó aviso." });
      return;
    }

    // ---- 2) Dispositivos suscritos ----
    const subsResp = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth`, {
      headers,
    });
    if (!subsResp.ok) throw new Error("No se pudieron leer las suscripciones de Supabase.");
    const subscriptions = await subsResp.json();

    if (!subscriptions.length) {
      res.status(200).json({ ok: true, sent: 0, note: "No hay ningún dispositivo suscrito todavía." });
      return;
    }

    // ---- 3) Armar el mensaje ----
    const count = pendingTasks.length;
    const title = count === 1 ? "🗂 Tienes 1 tarea pendiente" : `🗂 Tienes ${count} tareas pendientes`;
    const preview = pendingTasks
      .slice(0, 3)
      .map((t) => t.title)
      .join(" · ");
    const body = count > 3 ? `${preview} y ${count - 3} más…` : preview;

    const payload = JSON.stringify({ title, body, url: "./index.html", tag: "friday-tareas-pendientes" });

    // ---- 4) Enviar a cada dispositivo ----
    let sent = 0;
    const expired = [];

    await Promise.all(
      subscriptions.map(async (row) => {
        const subscription = {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };
        try {
          await webPush.sendNotification(subscription, payload);
          sent++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            expired.push(row.endpoint);
          }
        }
      })
    );

    // ---- 5) Limpiar suscripciones vencidas (el usuario desinstaló la app, etc.) ----
    if (expired.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=in.(${expired.map((e) => `"${e}"`).join(",")})`, {
        method: "DELETE",
        headers,
      }).catch(() => {});
    }

    res.status(200).json({ ok: true, sent, pendingTasks: count, removedExpired: expired.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
