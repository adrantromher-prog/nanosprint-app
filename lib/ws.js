function getWSS() {
  var v = globalThis.__wss;
  console.log("🔍 getWSS ->", v ? "WebSocketServer("+v.clients?.size+" clients)" : "NULL");
  return v;
}

function setWSS(server) {
  globalThis.__wss = server;
  console.log("🔌 WebSocket server GUARDADO en globalThis.__wss, clients:", server?.clients?.size || 0);
}

function broadcast(data) {
  var wss = globalThis.__wss;
  console.log("📡 broadcast intento type="+data.type+" wss="+(wss?"OK":"NULL"));
  if (!wss) { console.log("📡 broadcast SKIP: globalThis.__wss es null"); return; }
  var clients = [];
  try {
    clients = Array.from(wss.clients).filter(function(c) { return c.readyState === 1; });
  } catch(e) {
    console.log("📡 broadcast ERROR clients:", e.message);
    return;
  }
  console.log("📡 broadcast enviando type="+data.type+" a "+clients.length+" clientes (total conectados: "+wss.clients.size+")");
  var msg = JSON.stringify(data);
  for (var i = 0; i < clients.length; i++) {
    try {
      clients[i].send(msg, function() {});
      console.log("📡 broadcast ENVIADO a cliente #"+i);
    } catch(e) {
      console.log("📡 broadcast send ERROR a cliente #"+i+":", e.message);
    }
  }
}

function sendToUser(userId, data) {
  var wss = globalThis.__wss;
  if (!wss) { console.log("sendToUser [JS]: no wss"); return; }
  var msg = JSON.stringify(data);
  var found = 0;
  for (var i = 0; i < wss.clients.size; i++) {
    var clients = Array.from(wss.clients);
    var ws = clients[i];
    if (ws.readyState === 1 && ws.userId === userId) {
      try { ws.send(msg, function() {}); found++; } catch(e) {}
    }
  }
  console.log("sendToUser [JS]:", data.type, "to userId=" + userId, "found=" + found + "/" + wss.clients.size + " clients");
}

module.exports = { getWSS, setWSS, broadcast, sendToUser };
