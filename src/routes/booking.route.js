const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");
const auth = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const asyncHandler = require("../utils/asyncHandler");
const {
  createBookingValidation,
  updateBookingValidation,
  bookingIdValidation,
} = require("../validators/bookingValidation");

// POST /api/v1/bookings — إنشاء حجز جديد (Guest فقط)
router.post(
  "/",
  [auth, roleMiddleware(["guest"]), ...createBookingValidation],
  asyncHandler(bookingController.createBooking),
);

// GET /api/v1/bookings — جلب الحجوزات (Guest: حجوزاته، Admin: الكل)
router.get(
  "/",
  [auth, roleMiddleware(["guest", "admin"])],
  asyncHandler(bookingController.getMyBookings),
);

// GET /api/v1/bookings/:id — تفاصيل حجز واحد
router.get(
  "/:id",
  [auth, ...bookingIdValidation, roleMiddleware(["guest", "admin"])],
  asyncHandler(bookingController.getBookingById),
);

// PATCH /api/v1/bookings/:id/cancel — إلغاء حجز (Guest صاحب الحجز أو Admin)
router.patch(
  "/:id/cancel",
  [auth, ...bookingIdValidation, roleMiddleware(["guest", "admin"])],
  asyncHandler(bookingController.cancelBooking),
);

// PATCH /api/v1/bookings/:id/confirm — تأكيد حجز (Host أو Admin)
router.patch(
  "/:id/confirm",
  [auth, ...bookingIdValidation, roleMiddleware(["host", "admin"])],
  asyncHandler(bookingController.confirmBooking),
);

// PATCH /api/v1/bookings/:id — Update booking details (Guest owner only)
router.patch(
  "/:id",
  [
    auth,
    roleMiddleware(["guest"]),
    ...updateBookingValidation,
  ],
  asyncHandler(bookingController.updateBooking),
);

// DELETE /api/v1/bookings/:id — حذف ناعم (Admin فقط)
router.delete(
  "/:id",
  [auth, ...bookingIdValidation, roleMiddleware(["admin"])],
  asyncHandler(bookingController.deleteBooking),
);

module.exports = router;
