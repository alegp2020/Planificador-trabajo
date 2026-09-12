const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  try {
    const { clientId, subscription } = req.body || {};
    if (!clientId || !subscription) {
      res.status(400).json({ error: "Faltan datos (clientId o subscription)" });
      return;
    }
    await redis.set(`sub:${clientId}`, subscription);
    await redis.sadd("clients", clientId);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Error en /api/subscribe:", e);
    res.status(500).json({ error: "Error interno" });
  }
};
