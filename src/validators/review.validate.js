const validate = require("../middlewares/validate");
const { body } = require("express-validator");

const addReviewVaildation = [
    body("bookingId")
        .notEmpty().withMessage("BookingId is required")
        .isMongoId().withMessage("Invalid Id"),

    body("rating")
        .notEmpty().withMessage("Rating is required, between 1 to 5")
        .isInt({
            min: 1,
            max: 5
        }).withMessage("Rating must be an integier number between 1 to 5")
    ,

    body("comment")
        .optional({
            checkFalsy: true
        })
        .isString().withMessage("Comment must be string"),

    body("reviewerRole")
        .notEmpty().withMessage("ReviewerRole is required, between 1 to 5")
        .isString().withMessage("ReviewerRole must be string")
        .isIn(["guestToHost", "hostToGuest"]).withMessage("Invalid role provided"),

    validate
];

const updatedReviewValidation = [
    body("rating")
        .optional({
            checkFalsy: true
        })
        .isInt({
            min: 1,
            max: 5
        }).withMessage("Rating must be an integier number between 1 to 5")
        ,

    body("comment")
        .optional({
            checkFalsy: true
        })
        .isString().withMessage("Comment must be string"),

    validate
];

const reportReviewValidation = [
    body("reason")
        .notEmpty().withMessage("Reason is required")
        .isString().withMessage("Reason must be string"),

    validate
];

const handleReportValidation = [
    body("reportId")
        .notEmpty().withMessage("ReportId is require")
        .isString().withMessage("ReportId must be string"),

    body("action")
        .isIn(["delete", "dismiss"]).withMessage("Invalid val, the value must be delete or dismiss"),

    validate
];

module.exports = {
    addReviewVaildation,
    updatedReviewValidation,
    reportReviewValidation,
    handleReportValidation
};