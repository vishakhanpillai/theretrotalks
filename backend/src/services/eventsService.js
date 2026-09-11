const clients = new Set();

/**
 * Handle new Server-Sent Events (SSE) client connection
 */
const handleSseConnection = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`);

  clients.add(res);

  // Send lightweight keep-alive comment every 25 seconds to prevent timeout
  const heartbeat = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch {
      clearInterval(heartbeat);
      clients.delete(res);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
};

/**
 * Broadcast an event to all connected clients in real-time
 * @param {string} event - Event name e.g. "reviews_updated"
 * @param {object} data - Payload object
 */
const broadcast = (event, data = {}) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
};

module.exports = {
  handleSseConnection,
  broadcast,
};
