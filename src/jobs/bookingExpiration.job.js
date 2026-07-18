const cron = require("node-cron");
const Booking = require("../models/Booking");

// Pending booking expires after 24 hours
const PENDING_BOOKING_EXPIRATION_TIME =
  24 * 60 * 60 * 1000;

const expirePendingBookings = async () => {
  try {
    const now = new Date();

    // Any pending booking created before this time has exceeded 24 hours
    const expirationDate = new Date(
      now.getTime() -
        PENDING_BOOKING_EXPIRATION_TIME,
    );

    // Find pending bookings older than 24 hours
    const pendingExpiredBookings =
      await Booking.find({
        status: "pending",
        createdAt: {
          $lte: expirationDate,
        },
        isDeleted: false,
      }).select("_id");

    if (pendingExpiredBookings.length === 0) {
      console.log(
        "No pending bookings ready to expire.",
      );
      return;
    }

    for (const pendingBooking of pendingExpiredBookings) {
      try {
        // Re-check the booking state during update
        // to prevent processing the same booking more than once
        const expiredBooking =
          await Booking.findOneAndUpdate(
            {
              _id: pendingBooking._id,
              status: "pending",
              createdAt: {
                $lte: expirationDate,
              },
              isDeleted: false,
            },
            {
              $set: {
                status: "expired",
                expiredAt: new Date(),
              },
            },
            {
              returnDocument: "after",
            },
          );

        // The booking may have been confirmed, rejected,
        // or cancelled before this update
        if (!expiredBooking) {
          continue;
        }

        console.log(
          `Booking ${expiredBooking._id} expired automatically.`,
        );
      } catch (error) {
        console.error(
          `Failed to expire booking ${pendingBooking._id}:`,
          error.message,
        );
      }
    }
  } catch (error) {
    console.error(
      "Automatic booking expiration job failed:",
      error.message,
    );
  }
};

const startBookingExpirationJob = () => {
  cron.schedule(
    "0 * * * *",
    expirePendingBookings,
    {
      timezone: "UTC",
      noOverlap: true,
    },
  );

  console.log(
    "Automatic booking expiration job started.",
  );
};

module.exports = startBookingExpirationJob;