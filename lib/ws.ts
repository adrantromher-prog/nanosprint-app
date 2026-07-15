// @ts-ignore
declare global {
  var __wss: any;
}

export function getWSS() { return globalThis.__wss; }

export function setWSS(server: any) {
  globalThis.__wss = server;
  console.log(`🔌 [TS] WebSocket server GUARDADO en globalThis.__wss, clients: ${server?.clients?.size || 0}`);
}

export function sendToUser(userId: any, data: any) {
  const wss = globalThis.__wss;
  if (!wss) { console.log("sendToUser: no wss"); return; }
  const msg = JSON.stringify(data);
  let found = 0;
  for (const ws of [...wss.clients]) {
    if (ws.readyState === 1 && ws.userId === userId) {
      try { ws.send(msg, () => {}); found++; } catch(e: any) {}
    }
  }
  console.log("sendToUser:", data.type, "to userId=" + userId, "found=" + found + "/" + wss.clients.size + " clients");
}

export function broadcast(data: any) {
  const wss = globalThis.__wss;
  console.log(`📡 [TS] broadcast intento type=${data.type} wss=${wss ? "OK" : "NULL"}`);
  if (!wss) { console.log("📡 [TS] broadcast SKIP: globalThis.__wss es null", data.type); return; }
  const clients = [...wss.clients].filter((c: any) => c.readyState === 1);
  console.log(`📡 [TS] broadcast enviando type=${data.type} a ${clients.length} clientes (total: ${wss.clients.size})`);
  const msg = JSON.stringify(data);
  for (const c of clients) {
    try { c.send(msg, () => {}); } catch(e: any) { console.error("📡 [TS] broadcast send error:", e.message); }
  }
}
