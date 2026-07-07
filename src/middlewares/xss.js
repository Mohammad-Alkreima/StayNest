const xss = require("xss");

const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        return xss(input, {
            whiteList: {}, // empty means remove all tags
            stripIgnoreTag: true,
            stripIgnoreTagBody: ['script', 'style']
        }).trim();
    }
    return input;
};

// Middleware to sanitize all incoming data
const xssSanitize = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            req.body[key] = sanitizeInput(req.body[key]);
        });
    }
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            req.query[key] = sanitizeInput(req.query[key]);
        });
    }
    if (req.params) {
        Object.keys(req.params).forEach(key => {
            req.params[key] = sanitizeInput(req.params[key]);
        });
    }
    next();
};

module.exports = xssSanitize;