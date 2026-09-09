const adminRepository = require("../db/repositories/adminRepository");

const login = (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  const token = adminRepository.verifyPasswordAndCreateSession(password);
  if (!token) {
    return res.status(401).json({ error: "Invalid admin password" });
  }

  res.json({
    success: true,
    token,
    message: "Admin authentication successful",
  });
};

const getStatus = (req, res) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.headers["x-admin-token"];

  const isValid = adminRepository.validateSessionToken(token);
  res.json({ isAdmin: isValid });
};

const logout = (req, res) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.headers["x-admin-token"];

  if (token) {
    adminRepository.revokeSession(token);
  }
  res.json({ success: true, message: "Logged out" });
};

module.exports = {
  login,
  getStatus,
  logout,
};
