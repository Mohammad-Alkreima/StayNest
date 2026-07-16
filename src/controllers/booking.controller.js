const Booking = require("../models/Booking");
const Property = require("../models/Property");

class BookingController {

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
        const numberOfNights = Math.round(
            (end - start) / (1000 * 60 * 60 * 24)
        );

        if (numberOfNights < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid duration.",
            });
        }

        // Calculate prices
        const subtotal =
            numberOfNights * property.pricePerNight;

        const totalPrice =
            subtotal +
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
            pricePerNightAtBooking: property.pricePerNight,
            cleaningFeeAtBooking: property.cleaningFee || 0,
            serviceFeeAtBooking: property.serviceFee || 0,
            subtotal,
            totalPrice,
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
      const hasDateUpdate =
        startDate !== undefined || endDate !== undefined;

      // The following operations are required only when a booking date is updated
      if (hasDateUpdate) {
        // ─── 5. Build the final booking dates ───────────────────────────────
        // Use the new date when provided; otherwise keep the existing booking date
        const finalStartDate =
          startDate !== undefined
            ? new Date(startDate)
            : new Date(booking.startDate);

        const finalEndDate =
          endDate !== undefined
            ? new Date(endDate)
            : new Date(booking.endDate);

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
            message:
              "This property is already booked for the selected dates.",
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
        // Ensure the booking contains a complete and valid pricing snapshot
        const hasValidPricingSnapshot =
          Number.isFinite(booking.pricePerNightAtBooking) &&
          booking.pricePerNightAtBooking >= 0 &&
          Number.isFinite(booking.cleaningFeeAtBooking) &&
          booking.cleaningFeeAtBooking >= 0 &&
          Number.isFinite(booking.serviceFeeAtBooking) &&
          booking.serviceFeeAtBooking >= 0;

        if (!hasValidPricingSnapshot) {
          return res.status(409).json({
            success: false,
            message:
              "Booking pricing snapshot is missing or invalid. This booking cannot be updated.",
          });
        }

        // Recalculate the accommodation cost using the original booking price
        const subtotal =
          numberOfNights * booking.pricePerNightAtBooking;

        // Recalculate the final total using the stored booking fees
        const totalPrice =
          subtotal +
          booking.cleaningFeeAtBooking +
          booking.serviceFeeAtBooking;

        // Update the booking with the new dates and calculated values
        booking.startDate = finalStartDate;
        booking.endDate = finalEndDate;
        booking.numberOfNights = numberOfNights;
        booking.subtotal = subtotal;
        booking.totalPrice = totalPrice;
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
          message:
            "This property is already booked for the selected dates.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal Server Error during booking update.",
      });
    }
  };

}

module.exports = new BookingController();