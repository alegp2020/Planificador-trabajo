const { Redis } = require("@upstash/redis");
const webpush = require("web-push");

const redis = Redis.fromEnv();
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async (req, res) => {
  // Protegido con un secreto para que solo tu programador externo pueda llamarlo.
  const secret = req.query.secret || req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  try {
    const clientIds = (await redis.smembers("clients")) || [];
    const now = Date.now();
    let sentCount = 0;

    for (const clientId of clientIds) {
      const [subscription, reminders] = await Promise.all([
        redis.get(`sub:${clientId}`),
        redis.get(`reminders:${clientId}`)
      ]);
      if (!subscription || !reminders || !reminders.length) continue;

      let changed = false;
      for (const r of reminders) {
        if (r.sent) continue;
        const notifyAt = new Date(r.notifyAt).getTime();
        if (isNaN(notifyAt) || notifyAt > now) continue;

        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              id: r.id,
              title: "Recordatorio",
              body: r.start ? `${r.title} · ${r.start}` : r.title
            })
          );
          sentCount++;
        } catch (err) {
          if (err && (err.statusCode === 410 || err.statusCode === 404)) {
            // La suscripción ya no es válida (el usuario desinstaló/revocó permiso).
            await redis.del(`sub:${clientId}`);
          } else {
            console.error("Error enviando push a", clientId, err && err.message);
          }
        }
        r.sent = true;
        changed = true;
      }
      if (changed) await redis.set(`reminders:${clientId}`, reminders);
    }

    res.status(200).json({ ok: true, sent: sentCount, checked: clientIds.length });
  } catch (e) {
    console.error("Error en /api/send-due:", e);
    res.status(500).json({ error: "Error interno" });
  }
};
