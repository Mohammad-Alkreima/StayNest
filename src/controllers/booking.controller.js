const Booking = require("../models/Booking");
const Property = require("../models/Property");

class BookingController {
  // ──────────────────────────────────────────────
  // POST /api/v1/bookings
  // إنشاء حجز جديد — Guest فقط
  // ──────────────────────────────────────────────
  createBooking = async (req, res) => {
    try {
      const guestId = req._user.id;

      // startDate و endDate يصلان كـ Date objects بعد toDate() في الـ validator
      const { propertyId, startDate, endDate, paymentMethod } = req.body;

      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end   = endDate   instanceof Date ? endDate   : new Date(endDate);

      // ─── 1. جلب العقار ───────────────────────────────────────────────────
      const property = await Property.findOne({ _id: propertyId, isDeleted: false });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found or has been removed.",
        });
      }

      // ─── 2. العقار متاح للحجز؟ ───────────────────────────────────────────
      if (property.status !== "available") {
        return res.status(400).json({
          success: false,
          message: `Property is currently ${property.status} and cannot be booked.`,
        });
      }

      // ─── 3. المضيف لا يحجز عقاره بنفسه ──────────────────────────────────
      if (property.hostId.toString() === guestId) {
        return res.status(403).json({
          success: false,
          message: "You cannot book your own property.",
        });
      }

      // ─── 4. فحص تداخل التواريخ ───────────────────────────────────────────
      // الفهرس الفريد يمنع نفس التواريخ — هذا يمنع التداخل الجزئي أيضاً
      // مثال: حجز 1-10 أغسطس يمنع حجز 5-15 أغسطس
      const overlap = await Booking.findOne({
        propertyId,
        isDeleted: false,
        status: { $in: ["pending", "confirmed"] },
        startDate: { $lt: end },   // الحجز الموجود يبدأ قبل نهاية الطلب الجديد
        endDate:   { $gt: start }, // الحجز الموجود ينتهي بعد بداية الطلب الجديد
      });

      if (overlap) {
        return res.status(409).json({
          success: false,
          message: "This property is already booked for the selected dates.",
        });
      }

      // ─── 5. حساب السعر ───────────────────────────────────────────────────
      const MS_PER_DAY    = 1000 * 60 * 60 * 24;
      const numberOfNights = Math.round((end - start) / MS_PER_DAY);

      // خط دفاع إضافي — الـ validator يمنع هذا لكن نتأكد بعد الحساب
      if (numberOfNights < 1) {
        return res.status(400).json({
          success: false,
          message: "Booking must be at least 1 night.",
        });
      }

      const totalPrice =
        numberOfNights * property.pricePerNight +
        (property.cleaningFee || 0) +
        (property.serviceFee  || 0);

      // ─── 6. إنشاء الحجز ──────────────────────────────────────────────────
      const booking = await Booking.create({
        propertyId,
        guestId,
        startDate: start,
        endDate:   end,
        numberOfNights,
        totalPrice,
        paymentMethod: paymentMethod || "bankTransfer",
      });

      return res.status(201).json({
        success: true,
        message: "Booking created successfully ✅",
        data: booking,
      });

    } catch (error) {
      // خط دفاع ثانٍ ضد Race Condition — الفهرس الفريد في Booking.js
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This property is already booked for the selected dates.",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Internal Server Error during booking creation.",
      });
    }
  };
}

module.exports = new BookingController();
