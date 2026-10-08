const crypto = require("crypto");
const { db } = require("../connection");
const { ADMIN_PASSWORD } = require("../../config/env");

// 30 Days Session Time-To-Live
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const getAdminPassword = () => {
  if (!ADMIN_PASSWORD) {
    console.error("SECURITY ALERT: ADMIN_PASSWORD environment variable is not defined in backend/.env!");
    return null;
  }
  return ADMIN_PASSWORD;
};

const verifyPasswordAndCreateSession = async (password) => {
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
  await db.execute({
    sql: "INSERT INTO admin_sessions (token, created_at) VALUES (?, ?)",
    args: [token, now],
  });
  return token;
};

const validateSessionToken = async (token) => {
  if (!token || typeof token !== "string") return false;
  const res = await db.execute({
    sql: "SELECT * FROM admin_sessions WHERE token = ?",
    args: [token],
  });
  if (res.rows.length === 0) return false;

  const session = res.rows[0];
  const createdAt = Number(session.created_at) || 0;
  const now = Date.now();

  // Enforce session TTL expiry
  if (now - createdAt > SESSION_TTL_MS) {
    await revokeSession(token);
    return false;
  }

  return true;
};

const revokeSession = async (token) => {
  if (!token) return;
  await db.execute({
    sql: "DELETE FROM admin_sessions WHERE token = ?",
    args: [token],
  });
};

module.exports = {
  verifyPasswordAndCreateSession,
  validateSessionToken,
  revokeSession,
  SESSION_TTL_MS,
};
