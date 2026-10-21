/* global self */
// Activation is an explicit user action and must not reload another open app window.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "SENSE_ACTIVATE_UPDATE" || !event.ports[0]) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const scoped = windows.filter((client) => client.url.startsWith(self.registration.scope));
    if (scoped.length !== 1 || scoped[0].id !== event.source?.id) {
      event.ports[0].postMessage({ ok: false, reason: "other-windows" });
      return;
    }
    event.ports[0].postMessage({ ok: true });
    await self.skipWaiting();
  })());
});
