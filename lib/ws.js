let wss = null;

function getWSS() {
  return wss;
}

function setWSS(server) {
  wss = server;
}

function broadcast(data) {
  if (!wss) return;
  const message = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

module.exports = { getWSS, setWSS, broadcast };
