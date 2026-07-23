const { body, param, query } = require("express-validator");
const validate = require("../middlewares/validate");

const createDisputeValidation = [
  body("bookingId")
    .notEmpty()
    .withMessage("Booking ID is required")
    .isMongoId()
    .withMessage("Invalid Booking ID format"),

  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Dispute reason is required")
    .isString()
    .withMessage("Dispute reason must be a string")
    .isLength({ min: 10, max: 500 })
    .withMessage("Dispute reason must be between 10 and 500 characters")
    .escape(),

  validate,
];

const updateDisputeValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid Dispute ID format passed in URL"),

  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Dispute reason is required for update")
    .isString()
    .withMessage("Dispute reason must be a string")
    .isLength({ min: 10, max: 500 })
    .withMessage("Dispute reason must be between 10 and 500 characters")
    .escape(),

  validate,
];

const resolveDisputeValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid Dispute ID format passed in URL"),

  body("status")
    .notEmpty()
    .withMessage("Dispute status is required")
    .custom((status) => {
      const allowedStatuses = ["open", "in-progress", "resolved", "rejected"];
      if (!allowedStatuses.includes(status)) {
        throw new Error(
          `Invalid status value. Allowed values: ${allowedStatuses.join(", ")}`,
        );
      }
      return true;
    }),

  body("winner")
    .optional({ checkFalsy: true })
    .custom((winner) => {
      const allowedWinners = ["guest", "host"];
      if (!allowedWinners.includes(winner)) {
        throw new Error("Winner must be either 'guest' or 'host'");
      }
      return true;
    }),

  body("resolutionType")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Resolution type must be a string")
    .trim()
    .escape(),

  body("refundPercentage")
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage("Refund percentage must be a number")
    .custom((value) => {
      const num = Number(value);
      if (num < 0 || num > 100) {
        throw new Error("Refund percentage must be between 0 and 100");
      }
      return true;
    }),

  body("refundAmount")
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage("Refund amount must be a number")
    .custom((value) => {
      if (Number(value) < 0) {
        throw new Error("Refund amount cannot be negative");
      }
      return true;
    }),

  body("adminNotes")
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage("Admin notes must be a string")
    .isLength({ max: 1000 })
    .withMessage("Admin notes cannot exceed 1000 characters")
    .escape(),

  validate,
];


const filterDisputesValidation = [
  query("name")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Name must be a string")
    .trim(),

  query("type")
    .optional({ checkFalsy: true })
    .isIn(["host", "guest"])
    .withMessage("Type must be either host or guest"),

  query("status")
    .optional({ checkFalsy: true })
    .isIn(["open", "in-progress", "resolved"])
    .withMessage(
      "Status must be open, in-progress or resolved",
    ),

  validate,
];

module.exports = {
  createDisputeValidation,
  updateDisputeValidation,
  resolveDisputeValidation,
  filterDisputesValidation
};
