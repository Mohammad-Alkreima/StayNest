const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const uploadsController = require("../controllers/upload.controller");
const { uploadLocal } = require("../middlewares/multer");
const multer = require("multer");
const router = express.Router();

router.post(
  "/local",
  [uploadLocal.single("file")],
  asyncHandler(uploadsController.uploadFile),
);
router.post(
  "/external",
  [multer().single("file")],
  asyncHandler(uploadsController.externalUploadFile),
);

module.exports = router;
