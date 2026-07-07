const page = (req, res, next) => {
    req._limit = 30;
    req._page = +req.query.page || 1;
    next();
}

module.exports = page;