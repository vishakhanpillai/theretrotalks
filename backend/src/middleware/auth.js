const adminRepository = require("../db/repositories/adminRepository");

const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : req.headers["x-admin-token"];

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized: Admin access required to perform this action.",
      });
    }

    const isValid = await adminRepository.validateSessionToken(token);
    if (!isValid) {
      return res.status(401).json({
        error: "Unauthorized: Invalid or expired admin session token.",
      });
    }

    next();
  } catch (err) {
    console.error("Authentication middleware error:", err);
    return res.status(500).json({
      error: "Internal server error during authentication verification.",
    });
  }
};

module.exports = {
  requireAdmin,
};
