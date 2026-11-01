/* Push only: no offline cache of authenticated pages or API responses. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let data={};try{data=event.data?event.data.json():{};}catch{/* Always display a generic notification. */}
 event.waitUntil(self.registration.showNotification('The Table',{body:'New delivery assigned — open your dashboard.',icon:'/icons/app-192.png',badge:'/icons/app-192.png',tag:typeof data.tag==='string'?data.tag.slice(0,100):'delivery-assignment',data:{url:'/driver'}}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const target=new URL('/driver',self.location.origin).href;const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);if(existing){await existing.navigate(target);return existing.focus();}return self.clients.openWindow(target);})());});
