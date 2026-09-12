// Service worker: permite recibir notificaciones push aunque la app esté cerrada.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let data = { title: "Recordatorio", body: "" };
  try {
    if (event.data) data = event.data.json();
  } catch (e) { /* mensaje no era JSON, se usa el valor por defecto */ }

  event.waitUntil(
    self.registration.showNotification(data.title || "Recordatorio", {
      body: data.body || "",
      icon: "icon.png",
      badge: "icon.png",
      tag: "planner-reminder-" + (data.id || Date.now())
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) { if ("focus" in client) return client.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
