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
        // if failed verfy from refreshtoken or tyring renew it
        try {
            const data = refreshTokenService(req, res);
            req._user = { ...data };
            return next();
        } catch (refreshError) {
            // clear expired tokens
            cookiesService.clearTokens(res);
            return res.status(401).json({
                message: "Not Authorized",
                error: refreshError.message
            });
        }
    }
}

module.exports = auth;