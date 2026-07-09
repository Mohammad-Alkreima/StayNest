const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/property.controller");
const auth = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const asyncHandler = require("../utils/asyncHandler");
const idMiddleware = require("../middlewares/id");
const {
  createPropertyValidation,
  updatePropertyValidation,
} = require("../validators/propertyValidation");
router.get("/", auth, asyncHandler(propertyController.getAllProperties));

router.get(
  "/:id",
  [auth, idMiddleware],
  asyncHandler(propertyController.getPropertyById),
);

router.post(
  "/",
  [auth, createPropertyValidation, roleMiddleware("host")],
  asyncHandler(propertyController.createProperty),
);

router.put(
  "/:id",
  [auth, idMiddleware, updatePropertyValidation, roleMiddleware("host")],
  asyncHandler(propertyController.updateProperty),
);

router.delete(
  "/:id",
  [auth, idMiddleware, roleMiddleware("host", "admin")],
  asyncHandler(propertyController.deleteProperty),
);

module.exports = router;
