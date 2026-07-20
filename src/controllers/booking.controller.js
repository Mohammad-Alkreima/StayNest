const Booking = require("../models/Booking");
const Property = require("../models/Property");
const User = require("../models/User");

const LOYALTY_LEVELS = require("../constants/loyaltyLevels");

class BookingController {
  getLoyaltyLevel = (totalBookings) => {
    return LOYALTY_LEVELS.find(
      (level) => totalBookings >= level.minCompletedBookings,
    );
  };

  createBooking = async (req, res) => {
    const guestId = req._user.id;
    const { propertyId, startDate, endDate, paymentMethod } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Check if property exists
    const property = await Property.findOne({
      _id: propertyId,
      isDeleted: false,
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    // Check property availability
    if (property.status !== "available") {
      return res.status(400).json({
        success: false,
        message: "Property not available.",
      });
    }

    // Prevent the host from booking his own property
    if (property.hostId.toString() === guestId) {
      return res.status(403).json({
        success: false,
        message: "Cannot book your own property.",
      });
    }

    // Get guest information to calculate loyalty discount
    const guest = await User.findById(guestId);

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found.",
      });
    }
    const loyaltyLevel = this.getLoyaltyLevel(guest.totalBookings || 0);

    // Check overlapping bookings
    const overlap = await Booking.findOne({
      propertyId,
      isDeleted: false,
      status: { $in: ["pending", "confirmed"] },
      startDate: { $lt: end },
      endDate: { $gt: start },
    });

    if (overlap) {
      return res.status(409).json({
        success: false,
        message: "Dates overlap with existing booking.",
      });
    }

    // Calculate number of nights
    const numberOfNights = Math.round((end - start) / (1000 * 60 * 60 * 24));

    if (numberOfNights < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid duration.",
      });
    }

    // Calculate prices
    const subtotal = numberOfNights * property.pricePerNight;

    // Calculate the loyalty discount amount based on the guest's level
    const discountAmount = subtotal * (loyaltyLevel.discountPercentage / 100);

    // Calculate the final price after applying the discount
    // The loyalty discount applies only to the subtotal,
    // not to the cleaning fee or service fee.
    const totalPrice =
      subtotal -
      discountAmount +
      (property.cleaningFee || 0) +
      (property.serviceFee || 0);

    // Create booking
    const booking = await Booking.create({
      propertyId,
      hostId: property.hostId,
      guestId,
      startDate: start,
      endDate: end,
      numberOfNights,
      pricingSnapshot: {
        pricePerNight: property.pricePerNight,

        cleaningFee: property.cleaningFee || 0,

        serviceFee: property.serviceFee || 0,

        subtotal,

        discountPercentage: loyaltyLevel.discountPercentage,

        discountAmount,

        totalPrice,
      },
      paymentMethod: paymentMethod || "bankTransfer",
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      data: booking,
    });
  };

  getHostBookings = async (req, res) => {
    const hostId = req._user.id;

    const bookings = await Booking.find({
      hostId,
      isDeleted: false,
    })
      .populate("propertyId", "title location")
      .populate("guestId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  };


// ──────────────────────────────────────────────
// GET /api/v1/bookings
// Get bookings according to the logged-in user's role
//
// Guest → bookings created by this guest
// Host  → bookings received by this host
// Admin → all bookings
//
// Supported filters:
// status, paymentStatus, type, sort
// ──────────────────────────────────────────────
getBookings = async (req, res) => {
  // Get logged-in user information from the authentication middleware
  const loggedInUserId = req._user.id;
  const loggedInUserRole = req._user.role;

  // Read filters from the URL query parameters
  const {
    status,
    paymentStatus,
    type,
    sort = "newest",
  } = req.query;

  // This object will gradually contain all MongoDB search conditions
  const query = {
    isDeleted: false,
  };

  // ─── 1. Restrict results according to the user's role ──────────

  // A guest can see only bookings that they created
  if (loggedInUserRole === "guest") {
    query.guestId = loggedInUserId;
  }

  // A host can see only bookings received on their properties
  if (loggedInUserRole === "host") {
    query.hostId = loggedInUserId;
  }

  // An admin does not receive a guestId or hostId restriction,
  // so the admin can see all non-deleted bookings
  if (
    !["guest", "host", "admin"].includes(loggedInUserRole)
  ) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to view bookings.",
    });
  }

  // ─── 2. Filter by booking status ───────────────────────────────

  const allowedStatuses = [
    "pending",
    "confirmed",
    "rejected",
    "expired",
    "cancelled",
    "completed",
  ];

  if (status !== undefined) {
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}.`,
      });
    }

    query.status = status;
  }

  // ─── 3. Filter by payment status ───────────────────────────────

  const allowedPaymentStatuses = [
    "pending",
    "paid",
    "failed",
    "refunded",
  ];

  if (paymentStatus !== undefined) {
    if (!allowedPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid paymentStatus. Allowed values: ${allowedPaymentStatuses.join(", ")}.`,
      });
    }

    query.paymentStatus = paymentStatus;
  }

  // ─── 4. Filter by booking period ───────────────────────────────

  const allowedTypes = ["upcoming", "ongoing", "past"];

  if (type !== undefined) {
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Allowed values: ${allowedTypes.join(", ")}.`,
      });
    }

    // Normalize today so the comparison is based on calendar dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // The stay has not started yet
    if (type === "upcoming") {
      query.startDate = {
        $gt: today,
      };
    }

    // The stay has started but has not ended yet
    if (type === "ongoing") {
      query.startDate = {
        $lte: today,
      };

      query.endDate = {
        $gt: today,
      };
    }

    // The stay has already ended
    if (type === "past") {
      query.endDate = {
        $lte: today,
      };
    }
  }

  // ─── 5. Build the sorting rule ─────────────────────────────────

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },

    checkInSoonest: { startDate: 1 },
    checkInLatest: { startDate: -1 },

    priceHigh: { "pricingSnapshot.totalPrice": -1 },
    priceLow: { "pricingSnapshot.totalPrice": 1 },
  };

  if (!sortOptions[sort]) {
    return res.status(400).json({
      success: false,
      message: `Invalid sort value. Allowed values: ${Object.keys(
        sortOptions,
      ).join(", ")}.`,
    });
  }

  // ─── 6. Execute the database query ─────────────────────────────

  const bookings = await Booking.find(query)
    .populate("propertyId", "title location images")
    .populate("guestId", "name email")
    .populate("hostId", "name email")
    .sort(sortOptions[sort]);

  // ─── 7. Return the result ──────────────────────────────────────

  return res.status(200).json({
    success: true,
    count: bookings.length,

    filters: {
      status: status || null,
      paymentStatus: paymentStatus || null,
      type: type || null,
      sort,
    },

    data: bookings,
  });
};


  getHostEarnings = async (req, res) => {
    const hostId = req._user.id;
    const platformCommission = 0.1;

    const earnings = await Booking.aggregate([
      {
        $match: {
          hostId: new mongoose.Types.ObjectId(hostId),
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalGrossEarnings: { $sum: "$totalPrice" },
          totalBookings: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalBookings: 1,
          totalGrossEarnings: 1,
          platformFees: {
            $multiply: ["$totalGrossEarnings", platformCommission],
          },
          netEarnings: {
            $subtract: [
              "$totalGrossEarnings",
              { $multiply: ["$totalGrossEarnings", platformCommission] },
            ],
          },
        },
      },
    ]);

    res.status(200).json(
      earnings[0] || {
        totalBookings: 0,
        totalGrossEarnings: 0,
        platformFees: 0,
        netEarnings: 0,
      },
    );
  };

  // ──────────────────────────────────────────────
  // PATCH /api/v1/bookings/:id
  // Update booking details — Guest owner only
  // ──────────────────────────────────────────────
  updateBooking = async (req, res) => {
    try {
      // Get the booking ID from the URL and the logged-in user ID from the token
      const bookingId = req.params.id;
      const loggedInUserId = req._user.id;

      // Read only the fields that are allowed to be updated
      const { startDate, endDate, paymentMethod } = req.body;

      // ─── 1. Get the booking ───────────────────────────────────────────────
      // Find the booking only if it has not been soft-deleted
      const booking = await Booking.findOne({
        _id: bookingId,
        isDeleted: false,
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found or has been removed.",
        });
      }

      // ─── 2. Check booking ownership ───────────────────────────────────────
      // Verify that the booking belongs to the logged-in guest
      if (booking.guestId.toString() !== loggedInUserId) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to update this booking.",
        });
      }

      // ─── 3. Check booking status ──────────────────────────────────────────
      // Allow updates only while the booking is still pending
      if (booking.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: `A ${booking.status} booking cannot be updated.`,
        });
      }

      // ─── 4. Check whether booking dates are being updated ─────────────────
      // Check whether the user provided a new start date or end date
      const hasDateUpdate = startDate !== undefined || endDate !== undefined;

      // The following operations are required only when a booking date is updated
      if (hasDateUpdate) {
        // ─── 5. Build the final booking dates ───────────────────────────────
        // Use the new date when provided; otherwise keep the existing booking date
        const finalStartDate =
          startDate !== undefined
            ? new Date(startDate)
            : new Date(booking.startDate);

        const finalEndDate =
          endDate !== undefined ? new Date(endDate) : new Date(booking.endDate);

        // ─── 6. Validate the final booking dates ────────────────────────────
        // Ensure the final dates are valid after merging existing and new values
        if (
          Number.isNaN(finalStartDate.getTime()) ||
          Number.isNaN(finalEndDate.getTime())
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid booking date format.",
          });
        }
        finalStartDate.setHours(0, 0, 0, 0);
        finalEndDate.setHours(0, 0, 0, 0);

        // Normalize today and the start date to compare calendar days
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const normalizedStartDate = new Date(finalStartDate);
        normalizedStartDate.setHours(0, 0, 0, 0);

        // Prevent updating the booking start date to a past day
        if (normalizedStartDate < today) {
          return res.status(400).json({
            success: false,
            message: "startDate cannot be in the past.",
          });
        }

        // Ensure the checkout date is after the check-in date
        if (finalEndDate <= finalStartDate) {
          return res.status(400).json({
            success: false,
            message: "endDate must be after startDate.",
          });
        }

        // ─── 7. Load and validate the property ──────────────────────────────
        // Load the related property and ensure it exists and is not soft-deleted
        const property = await Property.findOne({
          _id: booking.propertyId,
          isDeleted: false,
        });

        if (!property) {
          return res.status(404).json({
            success: false,
            message: "Property not found or has been removed.",
          });
        }

        // Changing dates acts like requesting a new period,
        // so the property must be available
        if (property.status !== "available") {
          return res.status(400).json({
            success: false,
            message: `Property is currently ${property.status} and booking dates cannot be updated.`,
          });
        }

        // ─── 8. Check for overlapping bookings ──────────────────────────────
        // Find another active booking for the same property
        // that overlaps the new dates
        const overlappingBooking = await Booking.findOne({
          // Exclude the current booking so it is not treated as its own conflict
          _id: { $ne: bookingId },

          propertyId: booking.propertyId,
          isDeleted: false,

          // Only pending and confirmed bookings block date availability
          status: { $in: ["pending", "confirmed"] },

          // Date-range overlap condition
          startDate: { $lt: finalEndDate },
          endDate: { $gt: finalStartDate },
        });

        if (overlappingBooking) {
          return res.status(409).json({
            success: false,
            message: "This property is already booked for the selected dates.",
          });
        }

        // ─── 9. Recalculate the number of nights ────────────────────────────
        // Calculate the number of nights using the validated final dates
        const MS_PER_DAY = 1000 * 60 * 60 * 24;

        const numberOfNights = Math.round(
          (finalEndDate - finalStartDate) / MS_PER_DAY,
        );

        // Ensure the booking contains at least one night
        if (numberOfNights < 1) {
          return res.status(400).json({
            success: false,
            message: "Booking must be at least 1 night.",
          });
        }

        // ─── 10. Recalculate the booking price using the stored snapshot ────
        // Get the stored pricing snapshot created when the booking was first made
        const pricingSnapshot = booking.pricingSnapshot;

        // Ensure the booking contains a complete and valid pricing snapshot
        const hasValidPricingSnapshot =
          pricingSnapshot &&
          Number.isFinite(pricingSnapshot.pricePerNight) &&
          pricingSnapshot.pricePerNight >= 0 &&
          Number.isFinite(pricingSnapshot.cleaningFee) &&
          pricingSnapshot.cleaningFee >= 0 &&
          Number.isFinite(pricingSnapshot.serviceFee) &&
          pricingSnapshot.serviceFee >= 0 &&
          Number.isFinite(pricingSnapshot.discountPercentage) &&
          pricingSnapshot.discountPercentage >= 0;

        if (!hasValidPricingSnapshot) {
          return res.status(409).json({
            success: false,
            message:
              "Booking pricing snapshot is missing or invalid. This booking cannot be updated.",
          });
        }

        // Recalculate the accommodation subtotal using the original nightly price
        const subtotal = numberOfNights * pricingSnapshot.pricePerNight;

        // Preserve the original loyalty discount percentage
        const discountAmount =
          subtotal * (pricingSnapshot.discountPercentage / 100);

        // Recalculate the final price
        const totalPrice =
          subtotal -
          discountAmount +
          pricingSnapshot.cleaningFee +
          pricingSnapshot.serviceFee;

        // Update booking dates
        booking.startDate = finalStartDate;
        booking.endDate = finalEndDate;
        booking.numberOfNights = numberOfNights;

        // Update only the calculated values inside the pricing snapshot
        booking.pricingSnapshot.subtotal = subtotal;
        booking.pricingSnapshot.discountAmount = discountAmount;
        booking.pricingSnapshot.totalPrice = totalPrice;
      } // End of hasDateUpdate

      // ─── 11. Update payment method ────────────────────────────────────────
      // Update the payment method only when it is provided in the request
      if (paymentMethod !== undefined) {
        booking.paymentMethod = paymentMethod;
      }

      // ─── 12. Save the updated booking ─────────────────────────────────────
      // Save the booking only after all validations and calculations succeed
      await booking.save();

      // Return the updated booking with a clear success response
      return res.status(200).json({
        success: true,
        message: "Booking updated successfully ✅",
        data: booking,
      });
    } catch (error) {
      console.error("Update Booking Error:", error);

      // Handle an exact duplicate active booking period
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This property is already booked for the selected dates.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal Server Error during booking update.",
      });
    }
  };

  // ──────────────────────────────────────────────
  // PATCH /api/v1/bookings/:id/cancel
  // Cancel booking — Guest owner or Admin
  // ──────────────────────────────────────────────
  cancelBooking = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const loggedInUserId = req._user.id;
      const loggedInUserRole = req._user.role;
      const { cancellationReason } = req.body;
      // ─── 1. Get the booking ─────────────────────────────────────
      // Find the booking only if it has not been soft-deleted
      const booking = await Booking.findOne({
        _id: bookingId,
        isDeleted: false,
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found or has been removed.",
        });
      }

      // ─── 2. Check cancellation permission ───────────────────────
      // Allow cancellation only for the booking owner or an admin
      const isBookingOwner = booking.guestId.toString() === loggedInUserId;

      const isAdmin = loggedInUserRole === "admin";

      if (!isBookingOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to cancel this booking.",
        });
      }

      // ─── 3. Check booking status ─────────────────────────────────
      // Allow cancellation only for pending or confirmed bookings
      if (!["pending", "confirmed"].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: `A ${booking.status} booking cannot be cancelled.`,
        });
      }

      // ─── 4. Prevent cancellation after the stay has started ─────
      // Compare calendar days only, without considering the time
      const now = new Date();

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const normalizedStartDate = new Date(booking.startDate);
      normalizedStartDate.setHours(0, 0, 0, 0);

      if (normalizedStartDate <= today) {
        return res.status(400).json({
          success: false,
          message:
            "This booking cannot be cancelled after the stay has started.",
        });
      }

      // ─── 5. Calculate days before check-in ──────────────────────
      // Used later to determine the refund policy
      const MS_PER_DAY = 1000 * 60 * 60 * 24;

      const todayUTC = Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );

      const startDateUTC = Date.UTC(
        normalizedStartDate.getFullYear(),
        normalizedStartDate.getMonth(),
        normalizedStartDate.getDate(),
      );

      const daysBeforeStart = Math.floor(
        (startDateUTC - todayUTC) / MS_PER_DAY,
      );

      // ─── 6. Calculate the refund ─────────────────────────────────
      // Refunds apply only to bookings that have already been paid
      let refundPercentage = 0;
      let refundAmount = 0;

      if (booking.paymentStatus === "paid") {
        // Determine the refund percentage based on how early
        // the booking was cancelled before check-in
        if (daysBeforeStart >= 7) {
          refundPercentage = 100;
        } else if (daysBeforeStart >= 2) {
          refundPercentage = 50;
        }

        // Get the final amount that was agreed upon
        // when the booking was created
        const bookingTotalPrice = booking.pricingSnapshot?.totalPrice;

        // Ensure the stored booking price is valid
        // before using it to calculate a refund
        if (!Number.isFinite(bookingTotalPrice) || bookingTotalPrice < 0) {
          return res.status(409).json({
            success: false,
            message:
              "Booking pricing snapshot is missing or invalid. Refund cannot be calculated.",
          });
        }

        // Calculate the refundable amount from the stored final price
        refundAmount = Number(
          ((bookingTotalPrice * refundPercentage) / 100).toFixed(2),
        );
      }

      // ─── 7. Update cancellation information ─────────────────────
      // Mark the booking as cancelled and store the cancellation details
      booking.status = "cancelled";
      booking.cancelledAt = now;
      booking.cancelledBy = loggedInUserId;
      booking.cancelledByRole = loggedInUserRole;
      booking.cancellationReason = cancellationReason?.trim() || null;
      booking.refund = {
        refundPercentage,
        refundAmount,
        refundStatus: refundAmount > 0 ? "pending" : "notRequired",
        refundedAt: null,
      };

      // ─── 8. Save the updated booking ─────────────────────────────
      // Save all cancellation changes to the database
      await booking.save();

      // ─── 9. Return success response ──────────────────────────────
      // Return the updated booking after successful cancellation
      return res.status(200).json({
        success: true,
        message: "Booking cancelled successfully.",
        data: booking,
      });
    } catch (error) {
      console.error("Cancel Booking Error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal Server Error during booking cancellation.",
      });
    }
  };

  // ──────────────────────────────────────────────
  // PATCH /api/v1/bookings/:id/confirm
  // Confirm booking — Property Host or Admin
  // ──────────────────────────────────────────────
  confirmBooking = async (req, res) => {
    try {
      // Get booking ID and logged-in user information
      const bookingId = req.params.id;
      const loggedInUserId = req._user.id;
      const loggedInUserRole = req._user.role;

      // ─── 1. Find booking ─────────────────────────────
      const booking = await Booking.findOne({
        _id: bookingId,
        isDeleted: false,
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found or has been removed.",
        });
      }

      // ─── 2. Check permission ─────────────────────────
      const isBookingHost = booking.hostId.toString() === loggedInUserId;

      const isAdmin = loggedInUserRole === "admin";

      if (!isBookingHost && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to confirm this booking.",
        });
      }

      // ─── 3. Check booking status ─────────────────────
      if (booking.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: `A ${booking.status} booking cannot be confirmed.`,
        });
      }

      // ─── 4. Confirm the booking ─────────────────────
      // Change the booking status from pending to confirmed
      booking.status = "confirmed";

      // Store the exact time when the booking was confirmed
      booking.confirmedAt = new Date();

      // ─── 5. Save the booking ────────────────────────
      await booking.save();

      // ─── 6. Return success response ─────────────────
      return res.status(200).json({
        success: true,
        message: "Booking confirmed successfully.",
        data: booking,
      });
    } catch (error) {
      console.error("Confirm Booking Error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal Server Error during booking confirmation.",
      });
    }
  };

  // Reject booking
  rejectBooking = async (req, res) => {
    try {
      const bookingId = req.params.id;

      const { rejectionReason } = req.body;

      const loggedInUserId = req._user.id;
      const loggedInUserRole = req._user.role;

      // Find booking
      const booking = await Booking.findOne({
        _id: bookingId,
        isDeleted: false,
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      // Check authorization
      const isBookingHost =
        booking.hostId.toString() === loggedInUserId.toString();

      const isAdmin = loggedInUserRole === "admin";

      if (!isBookingHost && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to reject this booking.",
        });
      }

      // Only pending bookings can be rejected
      if (booking.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending bookings can be rejected.",
        });
      }

      // Validate rejection reason
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required.",
        });
      }

      // Reject booking
      booking.status = "rejected";

      booking.rejectedAt = new Date();

      booking.rejectedBy = loggedInUserId;

      booking.rejectionReason = rejectionReason.trim();

      await booking.save();

      return res.status(200).json({
        success: true,
        message: "Booking rejected successfully.",
        data: booking,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong while rejecting the booking.",
        error: error.message,
      });
    }
  };
}

module.exports = new BookingController();
