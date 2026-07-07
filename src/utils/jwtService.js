require("dotenv").config();
const jwt = require("jsonwebtoken");

class JwtService {
    generateAccessToken(payload) {
        return jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "1h" })
    }

    generateRefreshToken(payload) {
        return jwt.sign(payload, process.env.REFRESH_JWT_SECRET_KEY, { expiresIn: "7d" })
    }

    verifyAccessToken(token) {
        return jwt.verify(token, process.env.JWT_SECRET_KEY)
    }

    verifyRefreshToken(token) {
        return jwt.verify(token, process.env.REFRESH_JWT_SECRET_KEY)
    }
}

module.exports = new JwtService();