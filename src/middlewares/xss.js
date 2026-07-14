const xss = require("xss");

const sanitizeValue = (input) => {
    if (typeof input === "string") {
        return xss(input, {
            whiteList: {},
            stripIgnoreTag: true,
            stripIgnoreTagBody: ["script", "style"],
        }).trim();
    }
    return input;
};

// يشتغل بشكل recursive على nested objects وArrays
const sanitizeDeep = (data) => {
    if (typeof data === "string") return sanitizeValue(data);
    if (Array.isArray(data)) return data.map(sanitizeDeep);
    if (data !== null && typeof data === "object") {
        const result = {};
        for (const key of Object.keys(data)) {
            result[key] = sanitizeDeep(data[key]);
        }
        return result;
    }
    return data;
};

const xssSanitize = (req, res, next) => {
    if (req.body)   req.body   = sanitizeDeep(req.body);
    if (req.query)  req.query  = sanitizeDeep(req.query);
    if (req.params) req.params = sanitizeDeep(req.params);
    next();
};

module.exports = xssSanitize;
