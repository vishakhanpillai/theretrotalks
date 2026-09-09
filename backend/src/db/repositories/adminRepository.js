const crypto = require("crypto");
const { db } = require("../connection");
const { ADMIN_PASSWORD } = require("../../config/env");

const getAdminPassword = () => {
  if (!ADMIN_PASSWORD) {
    console.error("SECURITY ALERT: ADMIN_PASSWORD environment variable is not defined in backend/.env!");
    return null;
  }
  return ADMIN_PASSWORD;
};

const verifyPasswordAndCreateSession = (password) => {
  const expectedPassword = getAdminPassword();
  if (!expectedPassword || typeof password !== "string") {
    return null;
  }

  const inputBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(expectedPassword);

  if (inputBuf.length !== expectedBuf.length) {
    // Timing attack mitigation
    crypto.timingSafeEqual(inputBuf, inputBuf);
    return null;
  }

  if (!crypto.timingSafeEqual(inputBuf, expectedBuf)) {
    return null;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  db.prepare("INSERT INTO admin_sessions (token, created_at) VALUES (?, ?)").run(token, now);
  return token;
};

const validateSessionToken = (token) => {
  if (!token) return false;
  const session = db.prepare("SELECT * FROM admin_sessions WHERE token = ?").get(token);
  return Boolean(session);
};

const revokeSession = (token) => {
  if (!token) return;
  db.prepare("DELETE FROM admin_sessions WHERE token = ?").run(token);
};

module.exports = {
  verifyPasswordAndCreateSession,
  validateSessionToken,
  revokeSession,
};
