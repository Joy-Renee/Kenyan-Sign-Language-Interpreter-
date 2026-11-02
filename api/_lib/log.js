// One JSON line per event; read them in Vercel > Logs. Never log keys or raw IPs.
export function logEvent(obj) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), svc: 'ksl-proxy', ...obj }));
}
