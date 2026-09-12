const { Redis } = require("@upstash/redis");
const webpush = require("web-push");

const redis = Redis.fromEnv();
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  try {
    const { clientId } = req.body || {};
    if (!clientId) {
      res.status(400).json({ error: "Falta clientId" });
      return;
    }
    const subscription = await redis.get(`sub:${clientId}`);
    if (!subscription) {
      res.status(404).json({ error: "No hay ninguna suscripción push guardada para este dispositivo todavía. Prueba a activar las notificaciones desde 'Mi perfil' primero." });
      return;
    }
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: "Prueba de notificación", body: "Si ves esto, ¡las notificaciones fuera de la app funcionan! ✿" })
    );
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Error en /api/test-push:", e);
    res.status(500).json({ error: (e && e.message) || "Error interno enviando la notificación de prueba" });
  }
};
