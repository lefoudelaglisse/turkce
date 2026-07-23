/* Türkçe — service worker (hors-ligne + mises à jour fiables).
   À chaque nouvelle version de l'appli, incrémente le numéro CACHE
   (turkce-v2 -> turkce-v3 ...) pour nettoyer l'ancien cache. */
const CACHE = "turkce-v3";
const ASSETS = ["./", "./index.html", "./sw.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const isDoc = e.request.mode === "navigate" ||
    (e.request.destination === "document") ||
    e.request.url.endsWith("index.html") || e.request.url.endsWith("/");

  if (isDoc) {
    // Réseau d'abord : montre toujours la dernière version quand on est en ligne,
    // et retombe sur le cache hors-ligne.
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return resp;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
  } else {
    // Autres ressources : cache d'abord.
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return resp;
        }).catch(() => cached)
      )
    );
  }
});
