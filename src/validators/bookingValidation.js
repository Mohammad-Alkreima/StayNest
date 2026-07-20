const { body, param, query } = require("express-validator");
const validate = require("../middlewares/validate");

const ALLOWED_PAYMENT_METHODS = ["creditCard", "bankTransfer", "cash", "paypal"];

// ─── Create a new booking ─────────────────────────────────────────────────
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const bookingDate = new Date(value);
      bookingDate.setHours(0, 0, 0, 0);

      if (bookingDate < today) {
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
    const startValue = req.body.startDate;
    const start =
      startValue instanceof Date ? startValue : new Date(startValue);

    if (isNaN(start.getTime())) {
      return true;
    }

    if (endValue <= start) {
      throw new Error("endDate must be after startDate");
    }

    return true;
  }),
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
  validate,

]

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


// ─── Cancel booking ──────────────────────────────────────────────────────────
const cancelBookingValidation = [
  // Validate that the booking ID in the URL is a valid MongoDB ObjectId
  param("id")
    .isMongoId()
    .withMessage("Invalid booking ID format"),

  // cancellationReason is optional, but when provided it must be a valid string
  body("cancellationReason")
    .optional()
    .isString()
    .withMessage("cancellationReason must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("cancellationReason cannot be empty")
    .bail()
    .isLength({
        max: 500,
     })
    .withMessage(
      "cancellationReason cannot exceed 500 characters"
     ),

  // Allow only cancellationReason in the request body
  body().custom((requestBody) => {
    // Ensure the request body is a valid JSON object
    if (
      !requestBody ||
      typeof requestBody !== "object" ||
      Array.isArray(requestBody)
    ) {
      throw new Error("Request body must be a valid JSON object");
    }
    // The client is only allowed to provide an optional cancellation reason.
    const allowedFields = ["cancellationReason"];
    const receivedFields = Object.keys(requestBody);

    // Reject any client-controlled or unrelated fields
    const forbiddenFields = receivedFields.filter(
      (field) => !allowedFields.includes(field)
    );

    if (forbiddenFields.length > 0) {
      throw new Error(
        `Fields not allowed for cancellation: ${forbiddenFields.join(", ")}`
      );
    }

    return true;
  }),

  // Return express-validator errors using the project's standard response format
  validate,
];


// ─── Validate booking ID parameter ──────────────────────────────────────────
const bookingIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid booking ID format"),

  validate,
];

const getBookingsValidation = [
  query("status")
    .optional()
    .isIn([
      "pending",
      "confirmed",
      "rejected",
      "expired",
      "cancelled",
      "completed",
    ])
    .withMessage(
      "Status must be one of: pending, confirmed, rejected, expired, cancelled, completed.",
    ),

  query("paymentStatus")
    .optional()
    .isIn(["paid", "unpaid", "pending"])
    .withMessage(
    "Payment status must be one of: paid, unpaid, pending.",
     ),

  query("type")
    .optional()
    .isIn(["upcoming", "ongoing", "past"])
    .withMessage("Type must be one of: upcoming, ongoing, past."),

  query("sort")
    .optional()
    .isIn([
      "newest",
      "oldest",
      "checkInSoonest",
      "checkInLatest",
      "priceHigh",
      "priceLow",
    ])
    .withMessage(
      "Sort must be one of: newest, oldest, checkInSoonest, checkInLatest, priceHigh, priceLow.",
    ),

  query("propertyId")
    .optional()
    .isMongoId()
    .withMessage("Property ID must be a valid MongoDB ID."),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be an integer between 1 and 100."),



validate,
];



module.exports = {
  createBookingValidation,
  updateBookingValidation,
  cancelBookingValidation,
  bookingIdValidation,
  getBookingsValidation,
};
