const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // if error coming form multer
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = "File is too large! Max allowed size is 5MB."
    }
    if(err.code === "LIMIT_FILE_COUNT") {
        statusCode = 400;
        message = "Can not Upload More Than 8 Files"
    }

    return res.status(statusCode).json({
        success: false,
        message: message
    });
}

module.exports = errorHandler