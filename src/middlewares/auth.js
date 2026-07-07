const cookiesService = require("../utils/cookiesService");
const jwtService = require("../utils/jwtService");
const refreshTokenService = require("../utils/refreshTokenService");

const auth = (req, res, next) => {
    try {
        const token = cookiesService.getAccessToken(req);
        
        if(!token) {
            const data = refreshTokenService(req, res);
            req._user = { ...data };
            return next();
        }
        
        const decoded = jwtService.verifyAccessToken(token); 

        req._user = { ...decoded }
    
        next();
    } catch (error) {
        // في حال فشل التحقق من الـ Access Token أو فشل التجديد
        try {
            const data = refreshTokenService(req, res);
            req._user = { ...data };
            return next();
        } catch (refreshError) {
            // مسح الكوكيز التالفة/المنتهية وإرسال رد غير مصرح به
            cookiesService.clearTokens(res);
            return res.status(401).json({
                message: "Not Authorized",
                error: refreshError.message
            });
        }
    }
}

module.exports = auth;