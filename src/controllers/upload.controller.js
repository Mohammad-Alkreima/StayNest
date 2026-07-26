const uploadToCloudinary = require("../utils/uploadToCloudinary");
class uploadsController {
  externalUploadFile = async (req, res) => {
    const files = req.files;

    if (!files) {
      return res.status(400).json({ message: "files is required" });
    }

    const path = await uploadToCloudinary(files);
    if (!path) {
      return res.status(400).json({ message: "files is required" });
    }

    res.status(200).json({ path });
  };
}
module.exports = new uploadsController();
