const { body, param } = require("express-validator");
const validate = require("../middlewares/validate");
const createPropertyValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters")
    .escape(),

  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage("Description must be a string")
    .escape(),

  body("location")
    .trim()
    .notEmpty()
    .withMessage("Location is required")
    .isString()
    .withMessage("Location must be a string")
    .escape(),

  body("pricePerNight")
    .notEmpty()
    .withMessage("Price per night is required")
    .isNumeric()
    .withMessage("Price per night must be a number")
    .custom((value) => {
      if (Number(value) <= 0) {
        throw new Error(
          "Price per night must be a positive number greater than 0",
        );
      }
      return true;
    }),

  body("cleaningFee")
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage("Cleaning fee must be a number")
    .custom((value) => {
      if (Number(value) < 0) {
        throw new Error("Cleaning fee cannot be a negative value");
      }
      return true;
    }),

  body("serviceFee")
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage("Service fee must be a number")
    .custom((value) => {
      if (Number(value) < 0) {
        throw new Error("Service fee cannot be a negative value");
      }
      return true;
    }),

  body("maxGuests")
    .notEmpty()
    .withMessage("Max guests capacity is required")
    .isInt({ min: 1 })
    .withMessage("Max guests must be an integer and at least 1"),

  body("images")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Images must be sent as an array")
    .custom((imagesArray) => {
      // التحقق من أن كل عنصر داخل المصفوفة هو URL صالح
      const isAllURLs = imagesArray.every(
        (img) =>
          (typeof img === "string" &&
            img.match(/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg))/i)) ||
          img.startsWith("http"),
      );
      if (!isAllURLs) {
        throw new Error("Each image in the array must be a valid URL");
      }
      return true;
    }),

  body("status")
    .optional({ checkFalsy: true })
    .custom((status) => {
      const allowedStatuses = ["available", "unavailable", "maintenance"];
      if (!allowedStatuses.includes(status)) {
        throw new Error(
          `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
        );
      }
      return true;
    }),

  body("amenities")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Amenities must be sent as an array of strings")
    .custom((amenitiesArray) => {
      const isAllStrings = amenitiesArray.every(
        (item) => typeof item === "string",
      );
      if (!isAllStrings) {
        throw new Error("All amenities must be strings");
      }
      return true;
    }),

  validate,
];

const updatePropertyValidation = [
  // فحص سلامة الـ ID الممرر في الرابط كـ Parameter أولاً قبل فحص الـ Body
  param("id")
    .isMongoId()
    .withMessage("Invalid Property ID format passed in URL"),

  body("title")
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters")
    .escape(),

  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage("Description must be a string")
    .escape(),

  body("location")
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage("Location must be a string")
    .escape(),

  body("pricePerNight")
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage("Price per night must be a number")
    .custom((value) => {
      if (Number(value) <= 0) {
        throw new Error("Price must be a positive number");
      }
      return true;
    }),

  body("cleaningFee")
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage("Cleaning fee must be a number")
    .custom((value) => {
      if (Number(value) < 0) {
        throw new Error("Cleaning fee cannot be negative");
      }
      return true;
    }),

  body("serviceFee")
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage("Service fee must be a number")
    .custom((value) => {
      if (Number(value) < 0) {
        throw new Error("Service fee cannot be negative");
      }
      return true;
    }),

  body("maxGuests")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Max guests must be an integer and at least 1"),

  body("images")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Images must be sent as an array"),

  body("status")
    .optional({ checkFalsy: true })
    .custom((status) => {
      const allowedStatuses = ["available", "unavailable", "maintenance"];
      if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid status update value");
      }
      return true;
    }),

  body("amenities")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Amenities must be an array"),

  validate,
];

module.exports = {
  createPropertyValidation,
  updatePropertyValidation,
};
