const adminRepository = require("../db/repositories/adminRepository");

const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.headers["x-admin-token"];

  if (!token || !adminRepository.validateSessionToken(token)) {
    return res.status(401).json({
      error: "Unauthorized: Admin access required to perform this action.",
    });
  }
  next();
};

module.exports = {
  requireAdmin,
};
