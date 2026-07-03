self.addEventListener("push", (event) => {
  let data = { title: "Nanosprint", body: "", url: "/remates" };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; } catch {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",

      data: { url: data.url },
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/remates";
  event.waitUntil(clients.openWindow(url));
});
