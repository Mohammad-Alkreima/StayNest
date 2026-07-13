const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	message: {
        error: "Too Many Requests Per IP Address, Try Again Later"
    }
});

const loginLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 60 minutes
	limit: 25,
	message: {
        error: "Too Many Requests Per IP Address, Try Again Later"
    }
});

module.exports = {
    limiter,
    loginLimiter
}

