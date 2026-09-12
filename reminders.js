const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  try {
    const { clientId, reminders } = req.body || {};
    if (!clientId || !Array.isArray(reminders)) {
      res.status(400).json({ error: "Faltan datos (clientId o reminders)" });
      return;
    }
    // Conserva el estado "ya enviado" de los recordatorios que ya existían,
    // para no volver a notificar algo que ya se avisó.
    const existing = (await redis.get(`reminders:${clientId}`)) || [];
    const existingMap = new Map(existing.map(r => [r.id, r]));
    const merged = reminders.map(r => ({
      ...r,
      sent: existingMap.has(r.id) ? !!existingMap.get(r.id).sent : false
    }));
    await redis.set(`reminders:${clientId}`, merged);
    await redis.sadd("clients", clientId);
    res.status(200).json({ ok: true, count: merged.length });
  } catch (e) {
    console.error("Error en /api/reminders:", e);
    res.status(500).json({ error: "Error interno" });
  }
};
