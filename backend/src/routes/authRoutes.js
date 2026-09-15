const express = require("express");
const router = express.Router();
const multer = require("multer");
const authController = require("../controllers/authController");
const backupController = require("../controllers/backupController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});

router.post("/login", authController.login);
router.get("/status", authController.getStatus);
router.post("/logout", authController.logout);

// 1-Click Database & Data Export Routes
router.get("/backup/sqlite", backupController.downloadSqlite);
router.get("/backup/json", backupController.exportJson);
router.get("/backup/csv", backupController.exportCsv);

// Database & Data Import Route (.sqlite, .db, .json, .csv)
router.post("/backup/import", upload.single("file"), backupController.importDatabase);

module.exports = router;
