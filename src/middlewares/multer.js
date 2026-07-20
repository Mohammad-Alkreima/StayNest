const multer = require("multer");

// useing temp memory
const storageCloud = multer.memoryStorage();

// filtering function
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg", 
        "image/jpg", 
        "image/png", 
        "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // accept the file
    } else {
        const error = new Error("Invalid file type! Only JPEG, JPG, PNG and webp are allowed.");
        error.statusCode = 400;
        cb(error, false);
    }
};


const uploadCloud = multer({
    storage: storageCloud,
    fileFilter,
    limits: {
        files: 8,
        fileSize: 5 * 1024 * 1024 // 5MB
    }
})

module.exports = {
    uploadCloud
}