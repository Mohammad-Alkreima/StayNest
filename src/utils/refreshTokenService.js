const cookiesService = require("./cookiesService");
const jwtService = require("./jwtService");

const refreshTokenService = (req, res) => {
    const refreshToken = cookiesService.getRefreshToken(req);
    if (!refreshToken) {
        throw new Error("Refresh Token Required");
    }

    // verifyRefreshToken سيرمي خطأ تلقائياً إذا انتهت صلاحيته
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    
    const data = { 
        id: decoded.id, 
        email: decoded.email, 
        role: decoded.role
    };

    const token = jwtService.generateAccessToken(data);
    const refToken = jwtService.generateRefreshToken(data);
    
    cookiesService.setAccessToken(res, token);
    cookiesService.setRefreshToken(res, refToken);

    return data; // إرجاع البيانات لاستخدامها في الـ middleware
}

module.exports = refreshTokenService;