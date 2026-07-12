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

  // 🌍 التعديل الجوهري 1: التحقق من حقول كائن الموقع الجغرافي عند الإضافة
  body("location")
    .notEmpty()
    .withMessage("Location object is required")
    .isObject()
    .withMessage(
      "Location must be an object containing address and coordinates",
    ),

  body("location.address")
    .trim()
    .notEmpty()
    .withMessage("Location address text is required")
    .isString()
    .withMessage("Location address must be a string")
    .escape(),

  body("location.coordinates")
    .notEmpty()
    .withMessage("Coordinates are required")
    .isArray({ min: 2, max: 2 })
    .withMessage(
      "Coordinates must be an array of exactly two numbers [longitude, latitude]",
    )
    .custom((coordinatesArray) => {
      const [lng, lat] = coordinatesArray;
      if (typeof lng !== "number" || typeof lat !== "number") {
        throw new Error("Both longitude and latitude must be numbers");
      }
      if (lng < -180 || lng > 180) {
        throw new Error(
          "Longitude must be a valid number between -180 and 180",
        );
      }
      if (lat < -90 || lat > 90) {
        throw new Error("Latitude must be a valid number between -90 and 90");
      }
      return true;
    }),

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

  // 🌍 التعديل الجوهري 2: التحقق من حقول الموقع كـ حقول اختيارية عند التحديث (Optional Validation)
  body("location")
    .optional({ checkFalsy: true })
    .isObject()
    .withMessage("Location must be an object"),

  body("location.address")
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage("Location address must be a string")
    .escape(),

  body("location.coordinates")
    .optional({ checkFalsy: true })
    .isArray({ min: 2, max: 2 })
    .withMessage(
      "Coordinates must be an array of exactly two numbers [longitude, latitude]",
    )
    .custom((coordinatesArray) => {
      const [lng, lat] = coordinatesArray;
      if (typeof lng !== "number" || typeof lat !== "number") {
        throw new Error("Both longitude and latitude must be numbers");
      }
      if (lng < -180 || lng > 180) {
        throw new Error("Longitude must be between -180 and 180");
      }
      if (lat < -90 || lat > 90) {
        throw new Error("Latitude must be between -90 and 90");
      }
      return true;
    }),

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
