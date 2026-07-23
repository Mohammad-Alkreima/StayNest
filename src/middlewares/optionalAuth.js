const cookiesService = require("../utils/cookiesService");
const jwtService = require("../utils/jwtService");
const refreshTokenService = require("../utils/refreshTokenService");

const optionalAuth = (req, res, next) => {
    try {
        const token = cookiesService.getAccessToken(req);
        
        if (token) {
            const decoded = jwtService.verifyAccessToken(token);
            req._user = { ...decoded };
            return next();
        }

        // try refresh Access Token
        const data = refreshTokenService(req, res);
        req._user = { ...data };
        next();
    } catch (error) {
        // if failed all tries => user does not have an account
        req._user = null; 
        next();
    }
};

module.exports = optionalAuth;