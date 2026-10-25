// Staging navigations always check the server. Offline fallback is scoped to this release.
const CACHE = 'sense-staging-__SENSE_RELEASE__';
self.importScripts('/pwa-update-guard.js');
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache=await caches.open(CACHE);
  const manifest=await(await fetch('/staging-precache.json',{cache:'no-store'})).json();
  if(manifest.buildId!=='__SENSE_RELEASE__')throw new Error('Release changed while installing');
  for(const file of manifest.files){
    if(file.url!=='/index.html' && !file.url.startsWith('/assets/'))throw new Error('Invalid public shell path');
    const response=await fetch(file.url,{cache:'no-store'});if(!response.ok)throw new Error('Current shell unavailable');
    const bytes=await response.clone().arrayBuffer(),digest=await self.crypto.subtle.digest('SHA-256',bytes);
    const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    if(hash!==file.sha256)throw new Error('Shell asset belongs to another release');
    await cache.put(file.url,response);
  }
})()));
// No skipWaiting, client navigation, storage deletion or automatic reload.
self.addEventListener('fetch', event => {
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin || event.request.method!=='GET' || url.pathname.startsWith('/api'))return;
  if(event.request.mode==='navigate')event.respondWith((async()=>{
    try {
      const response=await fetch(event.request,{cache:'no-store'});
      if(response.ok){const cache=await caches.open(CACHE);await cache.put('/index.html',response.clone());}
      return response;
    }catch{const cached=await(await caches.open(CACHE)).match('/index.html');return cached??new Response('Connect to open Sense Studios',{status:503});}
  })());
  else if(url.pathname.startsWith('/assets/'))event.respondWith((async()=>{
    const cache=await caches.open(CACHE),cached=await cache.match(event.request);if(cached)return cached;
    const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;
  })());
});
