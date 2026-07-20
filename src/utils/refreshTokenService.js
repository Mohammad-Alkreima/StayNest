const cookiesService = require("./cookiesService");
const jwtService = require("./jwtService");

const refreshTokenService = (req, res) => {
    const refreshToken = cookiesService.getRefreshToken(req);
    if (!refreshToken) {
        throw new Error("Refresh Token Required");
    }

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

    return data; // return the data to using in the middleware
}

module.exports = refreshTokenService;