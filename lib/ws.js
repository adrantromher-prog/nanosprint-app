let wss = null;

export function getWSS() {
  return wss;
}

export function setWSS(server) {
  wss = server;
}

export function broadcast(data) {
  if (!wss) return;
  const message = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}
