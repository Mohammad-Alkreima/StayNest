const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const uploadsController = require("../controllers/upload.controller");
const { uploadLocal, uploadCloud } = require("../middlewares/multer");
const multer = require("multer");
const router = express.Router();

router.post(
  "/external",
  [uploadCloud.array("files")],
  asyncHandler(uploadsController.externalUploadFile),
);

module.exports = router;
