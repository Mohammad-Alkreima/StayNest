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



// ─── Update booking data ─────────────────────────────────────────────────────
const updateBookingValidation = [
  // Validate that the booking ID in the URL is a valid MongoDB ObjectId
  param("id")
    .isMongoId()
    .withMessage("Invalid booking ID format"),

  // startDate is optional, but when provided it must be a valid ISO 8601 date
  body("startDate")
    .optional()
    .isISO8601()
    .withMessage(
      "startDate must be a valid ISO 8601 date (e.g. 2026-08-01)"
    )
    .bail()
    .toDate(),

  // endDate is optional, but when provided it must be a valid ISO 8601 date
  body("endDate")
    .optional()
    .isISO8601()
    .withMessage(
      "endDate must be a valid ISO 8601 date (e.g. 2026-08-05)"
    )
    .bail()
    .toDate(),

  // paymentMethod is optional, but empty or unsupported values are not allowed
  body("paymentMethod")
    .optional()
    .isString()
    .withMessage("paymentMethod must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("paymentMethod cannot be empty")
    .bail()
    .custom((value) => {
      if (!ALLOWED_PAYMENT_METHODS.includes(value)) {
        throw new Error(
          `Invalid paymentMethod. Allowed values: ${ALLOWED_PAYMENT_METHODS.join(", ")}`
        );
      }

      return true;
    }),

  // Allow only the fields that the guest is permitted to update
  body().custom((requestBody) => {
    // Ensure the request body is a valid JSON object
    if (
      !requestBody ||
      typeof requestBody !== "object" ||
      Array.isArray(requestBody)
    ) {
      throw new Error("Request body must be a valid JSON object");
    }

    const allowedFields = [
      "startDate",
      "endDate",
      "paymentMethod",
    ];

    const receivedFields = Object.keys(requestBody);

    // At least one update field must be provided
    if (receivedFields.length === 0) {
      throw new Error(
        "At least one field must be provided for update"
      );
    }

    // Reject sensitive or server-calculated fields sent in the request
    const forbiddenFields = receivedFields.filter(
      (field) => !allowedFields.includes(field)
    );

    if (forbiddenFields.length > 0) {
      throw new Error(
        `Fields not allowed for update: ${forbiddenFields.join(", ")}`
      );
    }

    return true;
  }),
  // Return express-validator errors using the project's standard response format
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
  updateBookingValidation,
  bookingIdValidation,
};
