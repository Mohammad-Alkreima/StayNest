const role = (roles) => {
    return (req, res, next) => {
        if(roles.includes(req._user.role)) {
            next();
        } else {
            return res.status(403).json({
                message: "You Can Not Make This Action"
            })
        }
    }
}

module.exports = role;