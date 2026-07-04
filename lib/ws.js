let wss = null;

function getWSS() {
  return wss;
}

function setWSS(server) {
  wss = server;
  console.log(`🔌 WebSocket server inicializado con ${wss.clients?.size || 0} clientes`);
}

function broadcast(data) {
  if (!wss) {
    console.warn("⚠️ broadcast: wss es null, mensaje no enviado");
    return;
  }
  const message = JSON.stringify(data);
  let sent = 0;
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
      sent++;
    }
  }
  if (sent === 0) {
    console.warn("⚠️ broadcast: 0 clientes conectados, mensaje no enviado a nadie");
  }
}

module.exports = { getWSS, setWSS, broadcast };
