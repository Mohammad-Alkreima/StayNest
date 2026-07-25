const Booking = require("../models/Booking");
const Property = require("../models/Property");
const User = require("../models/User");
const mongoose = require("mongoose");


const LOYALTY_LEVELS = require("../constants/loyaltyLevels");

class BookingController {
  getLoyaltyLevel = (totalBookings) => {
    return LOYALTY_LEVELS.find(
      (level) => totalBookings >= level.minCompletedBookings,
    );
  };

  createBooking = async (req, res) => {
    const guestId = req._user.id;
    const { propertyId, startDate, endDate } = req.body;

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

      // Calculate the platform commission and host earning
      // at the time the booking is created.
      // These values are stored as a financial snapshot.
      const PLATFORM_COMMISSION_RATE = 0.1;

      const platformCommission = Number(
        (totalPrice * PLATFORM_COMMISSION_RATE).toFixed(2),
      );

      const hostEarning = Number(
        (totalPrice - platformCommission).toFixed(2),
      );

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
      payment: {
        status: "unpaid",
        platformCommission,
        hostEarning,
      },
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
    const { status, paymentStatus, type, sort = "newest" } = req.query;

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
    if (!["guest", "host", "admin"].includes(loggedInUserRole)) {
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

    if (paymentStatus !== undefined) {
      query["payment.status"] = paymentStatus;
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


// ──────────────────────────────────────────────
// Get earnings summary and monthly report
// Returns overall earnings statistics and monthly breakdown for the logged-in host
// ──────────────────────────────────────────────

  getHostEarnings = async (req, res) => {
    const hostId = req._user.id;
    

    const result = await Booking.aggregate([
      {
        $match: {
          hostId: new mongoose.Types.ObjectId(hostId),
          status: "completed",
           isDeleted: false,
           "payment.status": "released"
        },
      },
      {
        $facet: {
          // Overall earnings summary (KPIs)
          overallSummary: [
           {
              $group: {
                _id: null,

                totalBookings: {
                  $sum: 1,
                },

                totalRevenue: {
                  $sum: "$pricingSnapshot.totalPrice",
                },

                totalPlatformCommission: {
                  $sum: "$payment.platformCommission",
                },

                totalHostEarnings: {
                  $sum: "$payment.hostEarning",
                },
              },
            },
            {
            $project: {
              _id: 0,

              totalBookings: 1,

              totalRevenue: 1,

              totalPlatformCommission: 1,

              totalHostEarnings: 1,
            },
          },
          ],

          // Monthly earnings breakdown
          monthlyReport: [
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },

                bookingsCount: {
                  $sum: 1,
                },

                monthlyRevenue: {
                  $sum: "$pricingSnapshot.totalPrice",
                },

                monthlyPlatformCommission: {
                  $sum: "$payment.platformCommission",
                },

                monthlyHostEarnings: {
                  $sum: "$payment.hostEarning",
                },
              },
            },
            {
              $project: {
                _id: 0,

                year: "$_id.year",
                month: "$_id.month",

                bookingsCount: 1,

                monthlyRevenue: 1,

                monthlyPlatformCommission: 1,

                monthlyHostEarnings: 1,
              },
            },
            {
              $sort: {
                year: -1,
                month: -1,
              },
            },
          ],
                  },
      },
    ]);

   const summary = result[0].overallSummary[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      totalPlatformCommission: 0,
      totalHostEarnings: 0,
    };

    const monthlyBreakdown = result[0].monthlyReport || [];

    res.status(200).json({
      success: true,
      data: {
        summary,
        monthlyBreakdown,
      },
    });
  };

  // ──────────────────────────────────────────────
  // PATCH /api/v1/bookings/:id
  // Update booking details — Guest owner only
  // ──────────────────────────────────────────────
  updateBooking = async (req, res) => {
      // Get the booking ID from the URL and the logged-in user ID from the token
      const bookingId = req.params.id;
      const loggedInUserId = req._user.id;

      // Read only the fields that are allowed to be updated
      const { startDate, endDate } = req.body;

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

          // Recalculate the platform commission and host earning
          const PLATFORM_COMMISSION_RATE = 0.1;

          const platformCommission = Number(
            (totalPrice * PLATFORM_COMMISSION_RATE).toFixed(2),
          );

          const hostEarning = Number(
            (totalPrice - platformCommission).toFixed(2),
          );

        // Update booking dates
        booking.startDate = finalStartDate;
        booking.endDate = finalEndDate;
        booking.numberOfNights = numberOfNights;

        // Update only the calculated values inside the pricing snapshot
        booking.pricingSnapshot.subtotal = subtotal;
        booking.pricingSnapshot.discountAmount = discountAmount;
        booking.pricingSnapshot.totalPrice = totalPrice;
        booking.payment.platformCommission = platformCommission;
        booking.payment.hostEarning = hostEarning;
      } // End of hasDateUpdate

      // ─── 12. Save the updated booking ─────────────────────────────────────
      // Save the booking only after all validations and calculations succeed
      await booking.save();

      // Return the updated booking with a clear success response
      return res.status(200).json({
        success: true,
        message: "Booking updated successfully ✅",
        data: booking,
      });
  };

  // ──────────────────────────────────────────────
  // PATCH /api/v1/bookings/:id/cancel
  // Cancel booking — Guest owner or Admin
  // ──────────────────────────────────────────────
  cancelBooking = async (req, res) => {
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

      if (booking.payment?.status === "held") {
        // Determine the refund percentage based on how early
        // the booking was cancelled before check-in
        if (daysBeforeStart >= 7) {
          refundPercentage = 100;
        } else if (daysBeforeStart >= 2) {
          refundPercentage = 50;
        }

        // Get the amount that the guest actually paid
        // and is currently held by the platform
        const bookingTotalPrice = booking.payment.amount;

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

      // Update payment information only if the guest's payment is currently held
     if (booking.payment?.status === "held") {
      const paidAmount = booking.payment.amount;

      if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
        return res.status(409).json({
          success: false,
          message:
            "Held payment amount is missing or invalid. Cancellation cannot be completed.",
        });
      }

      booking.payment.refundPercentage = refundPercentage;
      booking.payment.refundAmount = refundAmount;
      booking.payment.refundedAt = refundAmount > 0 ? now : null;

      // Full refund: all money returns to the guest.
      if (refundPercentage === 100) {
        booking.payment.status = "refunded";
        booking.payment.platformCommission = 0;
        booking.payment.hostEarning = 0;
        booking.payment.releasedAt = null;
      }

      // Partial refund: part returns to the guest,
      // and the remaining amount is released to the host.
      else if (refundPercentage > 0) {
        const remainingAmount = Number(
          (paidAmount - refundAmount).toFixed(2),
        );

        const PLATFORM_COMMISSION_RATE = 0.1;

        const platformCommission = Number(
          (remainingAmount * PLATFORM_COMMISSION_RATE).toFixed(2),
        );

        const hostEarning = Number(
          (remainingAmount - platformCommission).toFixed(2),
        );

        booking.payment.status = "partially_refunded";
        booking.payment.platformCommission = platformCommission;
        booking.payment.hostEarning = hostEarning;
        booking.payment.releasedAt = now;
      }

      // No refund: all held money is released to the host.
      else {
        booking.payment.status = "released";
        booking.payment.refundPercentage = 0;
        booking.payment.refundAmount = 0;
        booking.payment.refundedAt = null;
        booking.payment.releasedAt = now;
      }
    }

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
  };


  // ──────────────────────────────────────────────
  // PATCH /api/v1/bookings/:id/confirm
  // Confirm booking — Property Host or Admin
  // ──────────────────────────────────────────────
  confirmBooking = async (req, res) => {
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
  };



    // ──────────────────────────────────────────────
    // PATCH /api/v1/bookings/:id/pay
    // Pay for a confirmed booking — Guest owner only
    // ──────────────────────────────────────────────
    payBooking = async (req, res) => {
      const bookingId = req.params.id;
      const loggedInUserId = req._user.id;
      const { paymentMethod } = req.body;

      // ─── 1. Validate payment method ─────────────────────
      const allowedPaymentMethods = [
        "creditCard",
        "bankTransfer",
        "paypal",
      ];

      if (!allowedPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment method. Allowed values: ${allowedPaymentMethods.join(
            ", ",
          )}.`,
        });
      }

      // ─── 2. Find booking ────────────────────────────────
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

      // ─── 3. Check booking ownership ─────────────────────
      if (booking.guestId.toString() !== loggedInUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to pay for this booking.",
        });
      }

      // ─── 4. Check booking status ────────────────────────
      if (booking.status !== "confirmed") {
        return res.status(400).json({
          success: false,
          message: "Only confirmed bookings can be paid.",
        });
      }

      // ─── 5. Check current payment status ────────────────
      if (booking.payment?.status !== "unpaid") {
        return res.status(400).json({
          success: false,
          message: `This booking payment is already ${booking.payment?.status}.`,
        });
      }

      // ─── 6. Validate payment amount ─────────────────────
      const bookingTotalPrice = booking.pricingSnapshot?.totalPrice;

      if (!Number.isFinite(bookingTotalPrice) || bookingTotalPrice <= 0) {
        return res.status(409).json({
          success: false,
          message:
            "Booking pricing snapshot is missing or invalid. Payment cannot be completed.",
        });
      }

      // ─── 7. Store payment information ───────────────────
      booking.payment.status = "held";
      booking.payment.method = paymentMethod;
      booking.payment.amount = bookingTotalPrice;
      booking.payment.paidAt = new Date();

      // ─── 8. Save booking ────────────────────────────────
      await booking.save();

      return res.status(200).json({
        success: true,
        message: "Payment completed successfully and funds are now held.",
        data: booking,
      });
    };



    // ──────────────────────────────────────────────
    // PATCH /api/v1/bookings/:id/complete
    // Complete a finished stay — Property Host or Admin
    // ──────────────────────────────────────────────
    completeBooking = async (req, res) => {
      const bookingId = req.params.id;
      const loggedInUserId = req._user.id;
      const loggedInUserRole = req._user.role;

      // ─── 1. Find booking ────────────────────────────────
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

      // ─── 2. Check permission ────────────────────────────
      // Only the property host or an admin can complete the booking
      const isBookingHost =
        booking.hostId.toString() === loggedInUserId.toString();

      const isAdmin = loggedInUserRole === "admin";

      if (!isBookingHost && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to complete this booking.",
        });
      }

      // ─── 3. Check booking status ────────────────────────
      if (booking.status !== "confirmed") {
        return res.status(400).json({
          success: false,
          message: `A ${booking.status} booking cannot be completed.`,
        });
      }

      // ─── 4. Check payment status ────────────────────────
      // The stay cannot be completed financially unless payment is held
      if (booking.payment?.status !== "held") {
        return res.status(400).json({
          success: false,
          message: "The booking must be paid before it can be completed.",
        });
      }

      // ─── 5. Ensure the stay has ended ───────────────────
      const now = new Date();

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const normalizedEndDate = new Date(booking.endDate);
      normalizedEndDate.setHours(0, 0, 0, 0);

      if (normalizedEndDate > today) {
        return res.status(400).json({
          success: false,
          message: "The booking cannot be completed before the stay ends.",
        });
      }

      // ─── 6. Complete booking ────────────────────────────
      booking.status = "completed";
      booking.completedAt = now;

      // Payment remains held during the dispute window
      // It will be released later if no dispute is opened
      await booking.save();

      return res.status(200).json({
        success: true,
        message:
          "Booking completed successfully. Payment remains held during the dispute period.",
        data: booking,
      });
    };

  // Reject booking
  rejectBooking = async (req, res) => {
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
  };
}

module.exports = new BookingController();
