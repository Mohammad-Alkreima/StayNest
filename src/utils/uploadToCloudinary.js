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
        // استخدام Promise.all لرفع كل الملفات في نفس الوقت
        const uploadPromises = files.map(async (file) => {
            // إنشاء مسار فريد للملف المؤقت لتجنب تداخل الأسماء (باستخدام الطابع الزمني)
            const uniqueName = `${Date.now()}-${file.originalname}`;
            const filePath = `${__dirname}/tmp/${uniqueName}`;
            
            // كتابة الملف المؤقت في السيرفر الخاص بك
            fs.writeFileSync(filePath, file.buffer);

            // رفع الملف إلى Cloudinary
            const result = await cloudinary.v2.uploader.upload(filePath, {
                resource_type: "auto"
            });

            // حذف الملف المؤقت فوراً بعد نجاح الرفع
            fs.unlinkSync(filePath);

            // إرجاع الرابط السحابي للملف الحالي
            return result.secure_url;
        });

        // انتظار انتهاء رفع جميع الملفات والتقاط روابطها
        const secureUrls = await Promise.all(uploadPromises);
        return secureUrls; // ستعود مصفوفة تحتوي على روابط الصور كاملة

    } catch (error) {
        console.error("Cloudinary Upload Error:", error.message);
        return null;
    }
}


module.exports = uploadToCloudinary;