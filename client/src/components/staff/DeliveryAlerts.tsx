import { useEffect, useRef, useState } from 'react';
/** Alerts only while this dashboard is open and its queue can refresh. No push/SMS claims. */
export default function DeliveryAlerts({ ids, ready, label }: { ids: string[]; ready: boolean; label: string }) {
 const [enabled,setEnabled]=useState(false),[message,setMessage]=useState('');
 const seen=useRef(new Set<string>()),audio=useRef<AudioContext|null>(null);
 async function enable(){
  try{audio.current ??= new AudioContext();await audio.current.resume();}catch{/* Visual alerts remain available. */}
  if('Notification' in window && Notification.permission==='default'){try{await Notification.requestPermission();}catch{/* Permission is optional. */}}
  seen.current=new Set();setEnabled(true);setMessage('Alerts enabled for this open dashboard. Keep it visible and online; there are no background push, SMS or phone-call alerts.');
 }
 useEffect(()=>{if(!ready||!enabled)return;const fresh=ids.filter(id=>!seen.current.has(id));ids.forEach(id=>seen.current.add(id));if(!fresh.length)return;
 const text=fresh.length+' '+label+' — review the queue.';setMessage(text);
 try{const ctx=audio.current;if(ctx?.state==='running'){const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.connect(gain);gain.connect(ctx.destination);gain.gain.value=0.12;oscillator.frequency.value=660;oscillator.start();oscillator.stop(ctx.currentTime+0.25);}}catch{/* Visual banner remains. */}
 if('Notification' in window && Notification.permission==='granted'){try{const notification=new Notification('The Table',{body:text,tag:'thetable-delivery'});notification.onclick=()=>{window.focus();notification.close();};}catch{/* Some browsers require service-worker notifications. */}}
 },[ids,ready,enabled,label]);
 useEffect(()=>()=>{void audio.current?.close();},[]);
 return <section className="delivery-alerts" aria-label="Delivery alerts"><button type="button" onClick={()=>{if(enabled){setEnabled(false);setMessage('Alerts paused.');}else void enable();}}>{enabled?'Pause delivery alerts':'Enable delivery alerts'}</button><p role="status">{message||'Enable sound and optional browser notifications for new assignments/issues while this dashboard is open.'}</p></section>;
}
