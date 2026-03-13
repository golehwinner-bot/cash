self.addEventListener("push", (event) => {
  let payload = { title: "Cashflow", body: "???? ??????????", url: "/" };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch (_error) {
    // Ignore malformed payload and use defaults.
  }

  const promise = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    data: { url: payload.url || "/" },
  });

  event.waitUntil(promise);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});
