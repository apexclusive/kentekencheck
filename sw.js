/* APEXclusive Kentekencheck — service worker.
   Doel: de app-shell (HTML/CSS/icoon) offline beschikbaar maken, zodat de tool
   ook zonder verbinding opent. RDW-datavragen (opendata.rdw.nl) gaan ALTIJD
   rechtstreeks naar het netwerk en worden nooit gecachet — die data moet actueel
   blijven. Alleen verzoeken naar onze eigen oorsprong komen in aanmerking. */
const VERSIE='kc-v3.6.4';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(VERSIE)
      .then(c=>c.addAll(APP_SHELL).catch(()=>{})) /* breek niet als een asset ontbreekt */
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==VERSIE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  /* Alleen onze eigen oorsprong; externe (RDW, fonts GA, WhatsApp-links) met rust laten */
  if(url.origin!==self.location.origin)return;

  /* Navigatie: netwerk eerst, bij offline terugvallen op de gecachete shell */
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req)
        .then(res=>{
          const kopie=res.clone();
          caches.open(VERSIE).then(c=>c.put('./index.html',kopie)).catch(()=>{});
          return res;
        })
        .catch(()=>caches.match('./index.html').then(c=>c||caches.match('./')))
    );
    return;
  }

  /* Overige statische eigen assets: cache eerst, netwerk als aanvulling */
  event.respondWith(
    caches.match(req).then(gevonden=>{
      if(gevonden)return gevonden;
      return fetch(req).then(res=>{
        if(res&&res.status===200){
          const kopie=res.clone();
          caches.open(VERSIE).then(c=>c.put(req,kopie)).catch(()=>{});
        }
        return res;
      }).catch(()=>caches.match('./index.html'));
    })
  );
});
