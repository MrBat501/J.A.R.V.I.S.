// ===== SERVICE WORKER DE FRIDAY =====
// Solo se encarga de recibir notificaciones push y de abrir la app al
// tocarlas. No cachea nada más (la app sigue cargando siempre en línea).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: "Friday", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Friday";
  const options = {
    body: payload.body || "",
    tag: payload.tag || "friday-tareas-pendientes",
    renotify: true,
    icon: "icon.svg",
    badge: "icon.svg",
    data: { url: payload.url || "./index.html" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "./index.html";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// Si el navegador renueva la suscripción sola (puede pasar de vez en
// cuando), la volvemos a mandar a Supabase para no perder el aviso diario.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const newSub = await self.registration.pushManager.subscribe(event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true });
        const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        clientsList.forEach((client) => client.postMessage({ type: "push-resubscribed", subscription: newSub.toJSON() }));
      } catch (err) {
        // Si falla, el botón de la campana volverá a mostrarse como inactivo
        // la próxima vez que se abra la app, y el Jefe puede reactivarlo.
      }
    })()
  );
});
