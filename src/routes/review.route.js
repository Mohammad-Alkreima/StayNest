const express = require("express");
const router = express.Router();

const checkBookingCompletion = require("../middlewares/checkBookingCompletion");
const asyncHandler = require("../utils/asyncHandler");
const reviewController = require("../controllers/review.controller");
const auth = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const optionalAuth = require("../middlewares/optionalAuth");
const id = require("../middlewares/id");
const page = require("../middlewares/page");
const { addReviewVaildation, reportReviewValidation, handleReportValidation, updatedReviewValidation } = require("../validators/review.validate");

// any one can see rating puplic
router.get("/all", [optionalAuth, page], asyncHandler(reviewController.getAllReviews));

// all properties
router.get("/allproperties", [optionalAuth, page], asyncHandler(reviewController.getAllPropertiesWithReviews));

// public 
router.get("/:id", [optionalAuth, id], asyncHandler(reviewController.getReviewById));

router.get("/property/:id", [optionalAuth, id], asyncHandler(reviewController.getReviewsByProperty));

router.post("/", [auth, roleMiddleware(["host", "guest"]), ...addReviewVaildation, checkBookingCompletion], asyncHandler(reviewController.addReview));

router.post("/:id/report", [auth, id, roleMiddleware(["host", "guest"]), ...reportReviewValidation], asyncHandler(reviewController.reportReview));
router.post("/:id/handle-report", [auth, id, roleMiddleware(["admin"]), ...handleReportValidation], asyncHandler(reviewController.handleReport));

router.put("/:id", [auth, id, ...updatedReviewValidation], asyncHandler(reviewController.updateReview));

module.exports = router;