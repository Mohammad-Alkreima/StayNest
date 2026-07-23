const cron = require("node-cron");
const Booking = require("../models/Booking");
const User = require("../models/User");

const completeExpiredBookings = async () => {
  try {
    const now = new Date();

    // We only look for confirmed bookings that have expired
    const expiredBookings = await Booking.find({
      status: "confirmed",
      endDate: { $lte: now },
      isDeleted: false,
    }).select("_id guestId");

    if (expiredBookings.length === 0) {
      console.log("No expired bookings found.");
      return;
    }

    for (const expiredBooking of expiredBookings) {
      try {
        //We re-check the booking status during the update

        // To prevent the same booking from being processed more than once
        const completedBooking = await Booking.findOneAndUpdate(
          {
            _id: expiredBooking._id,
            status: "confirmed",
            endDate: { $lte: now },
            isDeleted: false,
          },
          {
            $set: {
              status: "completed",
              completedAt: new Date(),
            },
          },
          {
            returnDocument: "after",
          },
        );

        // This means the booking status changed before we arrived at it
        if (!completedBooking) {
          continue;
        }

        // After successful booking completion, we increase the number of completed stays for the guest
        const updatedGuest = await User.findOneAndUpdate(
          {
            _id: completedBooking.guestId,
            isDeleted: false,
          },
          {
            $inc: {
              totalBookings: 1,
            },
          },
          {
            returnDocument: "after",
          },
        );

        if (!updatedGuest) {
          console.error(
            `Booking ${completedBooking._id} was completed, but guest ${completedBooking.guestId} was not updated.`,
          );

          continue;
        }

        console.log(
          `Booking ${completedBooking._id} completed automatically.`,
        );
      } catch (error) {
        console.error(
          `Failed to complete booking ${expiredBooking._id}:`,
          error.message,
        );
      }
    }
  } catch (error) {
    console.error(
      "Automatic booking completion job failed:",
      error.message,
    );
  }
};

const startCompleteExpiredBookingsJob = () => {
  cron.schedule(
    "0 * * * *",
    completeExpiredBookings,
    {
      timezone: "UTC",
      noOverlap: true,
    },
  );

  console.log("Automatic booking completion job started.");
};

module.exports = startCompleteExpiredBookingsJob;