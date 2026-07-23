require("dotenv").config();
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY_CLOUD,
    api_secret: process.env.API_SECRET_CLOUD,
})

const tempDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// array
const uploadToCloudinary = async (files) => {
    try {
        // to upload all files at the same time
        const uploadPromises = files.map(async (file) => {
            // create a unique path for the temp file
            const uniqueName = `${Date.now()}-${file.originalname}`;
            const filePath = `${__dirname}/tmp/${uniqueName}`;
            
            // write the temp file in the server
            fs.writeFileSync(filePath, file.buffer);

            // upload the file to cloudinary
            const result = await cloudinary.v2.uploader.upload(filePath, {
                resource_type: "auto"
            });

            // delete the temp file after success uploading
            fs.unlinkSync(filePath);

            // return the url
            return result.secure_url;
        });

        // waiting to finish uploading all files and cathing urls
        const secureUrls = await Promise.all(uploadPromises);
        return secureUrls; // return array contains all urls

    } catch (error) {
        console.error("Cloudinary Upload Error:", error.message);
        return null;
    }
}


module.exports = uploadToCloudinary;