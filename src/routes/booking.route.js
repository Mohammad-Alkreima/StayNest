const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");
const auth = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const asyncHandler = require("../utils/asyncHandler");

const {
  createBookingValidation,
  updateBookingValidation,
  cancelBookingValidation,
  bookingIdValidation,
} = require("../validators/bookingValidation");

// POST /api/v1/bookings
router.post(
  "/",
  [auth, roleMiddleware(["guest"]), ...createBookingValidation],
  asyncHandler(bookingController.createBooking),
);

// GET /api/v1/bookings/my-bookings
router.get(
  "/my-bookings",
  [auth, roleMiddleware(["host"])],
  asyncHandler(bookingController.getHostBookings),
);

// GET /api/v1/bookings
router.get(
  "/",
  [auth, roleMiddleware(["guest", "admin"])],
  asyncHandler(bookingController.getMyBookings),
);

// GET /api/v1/bookings/:id
router.get(
  "/:id",
  [auth, ...bookingIdValidation, roleMiddleware(["guest", "admin"])],
  asyncHandler(bookingController.getBookingById),
);

// PATCH /api/v1/bookings/:id/cancel
router.patch(
  "/:id/cancel",
  [
    auth,
    roleMiddleware(["guest", "admin"]),
    ...cancelBookingValidation,
  ],
  asyncHandler(bookingController.cancelBooking),
);

// PATCH /api/v1/bookings/:id/confirm
router.patch(
  "/:id/confirm",
  [auth, ...bookingIdValidation, roleMiddleware(["host", "admin"])],
  asyncHandler(bookingController.confirmBooking),
);

// PATCH /api/v1/bookings/:id
// Update booking details — Guest owner only
router.patch(
  "/:id",
  [
    auth,
    roleMiddleware(["guest"]),
    ...updateBookingValidation,
  ],
  asyncHandler(bookingController.updateBooking),
);

// DELETE /api/v1/bookings/:id
router.delete(
  "/:id",
  [auth, ...bookingIdValidation, roleMiddleware(["admin"])],
  asyncHandler(bookingController.deleteBooking),
);

module.exports = router;