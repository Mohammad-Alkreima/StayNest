const multer = require("multer");

// استخدام الذاكرة المؤقتة بدلاً من القرص الصلب
const storageCloud = multer.memoryStorage();

// دالة الفلترة (هنا نحدد ما هو مسموح به)
const fileFilter = (req, file, cb) => {
    // قائمة الأنواع المسموح بها (MIME Types)
    const allowedTypes = [
        "image/jpeg", 
        "image/jpg", 
        "image/png", 
        "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // اقبل الملف
    } else {
        const error = new Error("Invalid file type! Only JPEG, JPG, PNG and webp are allowed.");
        error.statusCode = 400; // نحدد كود الخطأ
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