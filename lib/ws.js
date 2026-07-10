let wss = null;

function getWSS() { return wss; }

function setWSS(server) {
  wss = server;
  console.log(`🔌 WebSocket server inicializado con ${wss.clients?.size || 0} clientes`);
}

function broadcast(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  for (const c of wss.clients) {
    if (c.readyState === 1) c.send(msg);
  }
}

module.exports = { getWSS, setWSS, broadcast };
