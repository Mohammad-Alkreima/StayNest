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
  getBookingsValidation,
} = require("../validators/bookingValidation");



// POST /api/v1/bookings
router.post(
  "/",
  [auth, roleMiddleware(["guest"]), ...createBookingValidation],
  asyncHandler(bookingController.createBooking),
);

// GET /api/v1/bookings
// Guest: returns bookings created by the guest
// Host: returns bookings received on the host's properties
// Admin: returns all bookings
router.get(
  "/",
  [
    auth,
    roleMiddleware(["guest", "host", "admin"]),
    ...getBookingsValidation,
  ],
  asyncHandler(bookingController.getBookings),
);


// src/routes/booking.route.js
router.get(
  "/host/earnings",
  auth,
  roleMiddleware(["host"]),
  asyncHandler(bookingController.getHostEarnings),
);

// GET /api/v1/bookings/:id
router.get(
  "/:id",
  [auth, ...bookingIdValidation, roleMiddleware(["guest", "host", "admin"])],
  asyncHandler(bookingController.getBookingById),
);

// PATCH /api/v1/bookings/:id/cancel
router.patch(
  "/:id/cancel",
  [auth, roleMiddleware(["guest", "admin"]), ...cancelBookingValidation],
  asyncHandler(bookingController.cancelBooking),
);


// PATCH /api/v1/bookings/:id/confirm
router.patch(
  "/:id/confirm",
  [auth, ...bookingIdValidation, roleMiddleware(["host", "admin"])],
  asyncHandler(bookingController.confirmBooking),
);

// PATCH /api/v1/bookings/:id/pay
// Pay for a confirmed booking — Guest owner only
router.patch(
  "/:id/pay",
  [
    auth,
    roleMiddleware(["guest"]),
    ...bookingIdValidation,
  ],
  asyncHandler(bookingController.payBooking),
);

// PATCH /api/v1/bookings/:id/complete
// Complete a finished stay — Property Host or Admin
router.patch(
  "/:id/complete",
  [auth, roleMiddleware(["host", "admin"]), ...bookingIdValidation],
  asyncHandler(bookingController.completeBooking),
);


// PATCH /api/v1/bookings/:id/reject
router.patch(
  "/:id/reject",
  [auth, ...bookingIdValidation, roleMiddleware(["host", "admin"])],
  asyncHandler(bookingController.rejectBooking),
);

// PATCH /api/v1/bookings/:id
// Update booking details — Guest owner only
router.patch(
  "/:id",
  [auth, roleMiddleware(["guest"]), ...updateBookingValidation],
  asyncHandler(bookingController.updateBooking),
);



module.exports = router;
