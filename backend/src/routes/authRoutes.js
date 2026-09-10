const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const backupController = require("../controllers/backupController");

router.post("/login", authController.login);
router.get("/status", authController.getStatus);
router.post("/logout", authController.logout);

// 1-Click Database & Data Export Routes
router.get("/backup/sqlite", backupController.downloadSqlite);
router.get("/backup/json", backupController.exportJson);
router.get("/backup/csv", backupController.exportCsv);

module.exports = router;
