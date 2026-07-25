const Booking = require("../models/Booking");
const User = require("../models/User");
const BOOKING_BLOCK_POLICY = require("../constants/bookingBlockPolicy");

const evaluateGuestBookingRestriction = async (guestId) => {
  const now = new Date();

  // Beginning of the rolling evaluation period.
  // Only cancellations during the last 30 days are counted.
  const evaluationStartDate = new Date(now);

  evaluationStartDate.setDate(
    evaluationStartDate.getDate() -
      BOOKING_BLOCK_POLICY.evaluationPeriodDays,
  );

  // Count only confirmed bookings cancelled by the guest.
  const confirmedCancellationsCount = await Booking.countDocuments({
    guestId,
    isDeleted: false,
    status: "cancelled",
    cancelledFromStatus: "confirmed",
    cancelledByRole: "guest",
    cancelledAt: {
      $gte: evaluationStartDate,
      $lte: now,
    },
  });

  const guest = await User.findById(guestId);

  if (!guest) {
    return {
      warning: false,
      blocked: false,
      confirmedCancellationsCount,
      message: "Guest not found.",
    };
  }

  // If the guest already has an active block,
  // do not calculate a new date or extend the current block.
  if (
    guest.bookingBlockedUntil &&
    guest.bookingBlockedUntil > now
  ) {
    return {
      warning: false,
      blocked: true,
      alreadyBlocked: true,
      confirmedCancellationsCount,
      bookingBlockedUntil: guest.bookingBlockedUntil,
    };
  }

  // ──────────────────────────────────────────────
  // Temporary booking block
  // Five or more confirmed cancellations
  // during the last 30 days.
  // ──────────────────────────────────────────────
  if (
    confirmedCancellationsCount >=
    BOOKING_BLOCK_POLICY.maximumConfirmedCancellations
  ) {
    const bookingBlockedAt = now;
    const bookingBlockedUntil = new Date(bookingBlockedAt);

    bookingBlockedUntil.setDate(
      bookingBlockedUntil.getDate() +
        BOOKING_BLOCK_POLICY.blockDurationDays,
    );

    guest.bookingBlockedAt = bookingBlockedAt;
    guest.bookingBlockedUntil = bookingBlockedUntil;

    guest.bookingBlockReason =
      `Cancelled ${confirmedCancellationsCount} confirmed bookings ` +
      `within the last ${BOOKING_BLOCK_POLICY.evaluationPeriodDays} days.`;

    await guest.save();

    return {
      warning: false,
      blocked: true,
      alreadyBlocked: false,
      confirmedCancellationsCount,
      bookingBlockedUntil,
    };
  }

  // Check whether a warning was already recorded
  // during the current 30-day evaluation period.
  const warningAlreadySentDuringCurrentPeriod =
    guest.bookingWarningSentAt &&
    guest.bookingWarningSentAt >= evaluationStartDate;

  // ──────────────────────────────────────────────
  // Warning
  // Exactly three confirmed cancellations
  // during the last 30 days.
  // ──────────────────────────────────────────────
  if (
    confirmedCancellationsCount ===
      BOOKING_BLOCK_POLICY.warningAfterConfirmedCancellations &&
    !warningAlreadySentDuringCurrentPeriod
  ) {
    guest.bookingWarningSentAt = now;

    await guest.save();

    return {
      warning: true,
      blocked: false,
      confirmedCancellationsCount,
    };
  }

  return {
    warning: false,
    blocked: false,
    confirmedCancellationsCount,
  };
};

module.exports = {
  evaluateGuestBookingRestriction,
};