const { body, param } = require("express-validator");
const validate = require("../middlewares/validate");

const ALLOWED_PAYMENT_METHODS = ["creditCard", "bankTransfer", "cash", "paypal"];

// ─── إنشاء حجز جديد ─────────────────────────────────────────────────────────
const createBookingValidation = [
  body("propertyId")
    .notEmpty()
    .withMessage("propertyId is required")
    .isMongoId()
    .withMessage("Invalid propertyId format"),

  body("startDate")
    .notEmpty()
    .withMessage("startDate is required")
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date (e.g. 2026-08-01)")
    .toDate()
    .custom((value) => {
      if (value < new Date()) {
        throw new Error("startDate cannot be in the past");
      }
      return true;
    }),

  body("endDate")
    .notEmpty()
    .withMessage("endDate is required")
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date (e.g. 2026-08-05)")
    .toDate()
    .custom((endValue, { req }) => {
      // req.body.startDate قد يكون Date object بعد toDate() أو string — نتعامل مع الحالتين
      const startValue = req.body.startDate;
      const start = startValue instanceof Date ? startValue : new Date(startValue);
      if (isNaN(start.getTime())) {
        // startDate فاشل بالفعل في الـ validator الخاص به — نتجاهل هنا
        return true;
      }
      if (endValue <= start) {
        throw new Error("endDate must be after startDate");
      }
      return true;
    }),

  body("paymentMethod")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("paymentMethod must be a string")
    .custom((value) => {
      if (!ALLOWED_PAYMENT_METHODS.includes(value)) {
        throw new Error(
          `Invalid paymentMethod. Allowed values: ${ALLOWED_PAYMENT_METHODS.join(", ")}`
        );
      }
      return true;
    }),

  validate,
];

// ─── التحقق من الـ id في الـ params ─────────────────────────────────────────
const bookingIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid booking ID format"),

  validate,
];

module.exports = {
  createBookingValidation,
  bookingIdValidation,
};
