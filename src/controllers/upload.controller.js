const uploadToCloudinary = require("../utils/uploadToCloudinary");
class uploadsController {
  uploadFile = async (req, res) => {
    // منطق رفع الملف محليًا

    const file = req.file;
    if (!file) {
      return res.status(400).json;
    }
    const filePath = file.path;

    res.status(200).json({
      success: true,
      message: "File uploaded locally successfully!",
      data: filePath,
    });
  };
  externalUploadFile = async (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "File is required" });
    }

    const path = await uploadToCloudinary(file);
    if (!path) {
      return res.status(400).json({ message: "File is required" });
    }

    res.status(200).json({ path });
  };
}
module.exports = new uploadsController();
