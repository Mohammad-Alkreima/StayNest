const notFound = (req, res, next) => {
    res.status(404).json("This Route Does not Exist");
}

module.exports = notFound