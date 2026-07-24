const Booking = require("../models/Booking");
const Dispute = require("../models/Dispute");

/**
 * Release one held payment to the host.
 *
 * This is an internal service function.
 * It is not called directly by the guest or host.
 *
 * @param {Object} booking - Mongoose booking document
 * @returns {Promise<Object>}
 */
const releaseHeldPayment = async (booking) => {
  if (!booking) {
    throw new Error("Booking is required.");
  }

  // The stay must be completed first
  if (booking.status !== "completed") {
    throw new Error("Only completed bookings can release payment.");
  }

  // The money must still be held by the platform
  if (booking.payment?.status !== "held") {
    throw new Error("Only held payments can be released.");
  }
// Do not release the payment if there is an active dispute.
// The money must remain held until the dispute is resolved.
  const activeDispute = await Dispute.findOne({
  bookingId: booking._id,
  status: {
    $in: ["open", "in-progress"],
  },
});

if (activeDispute) {
  throw new Error(
    "Payment cannot be released because there is an active dispute.",
  );
}

  booking.payment.status = "released";
  booking.payment.releasedAt = new Date();

  await booking.save();

  return booking;
};

/**
 * Find all completed bookings whose dispute window has ended,
 * then release their held payments.
 *
 * @returns {Promise<Object>}
 */
const releaseEligiblePayments = async () => {
  const DISPUTE_WINDOW_HOURS = 24;

  const releaseThreshold = new Date(
    Date.now() - DISPUTE_WINDOW_HOURS * 60 * 60 * 1000,
  );

  // Find bookings that:
  // 1. completed successfully
  // 2. still have a held payment
  // 3. completed at least 24 hours ago
  // 4. are not soft-deleted
  const eligibleBookings = await Booking.find({
    status: "completed",
    isDeleted: false,
    "payment.status": "held",
    completedAt: {
      $lte: releaseThreshold,
    },
  });

  let releasedCount = 0;
  const failedBookings = [];

  for (const booking of eligibleBookings) {
    try {
      await releaseHeldPayment(booking);
      releasedCount += 1;
    } catch (error) {
      failedBookings.push({
        bookingId: booking._id,
        message: error.message,
      });
    }
  }

    /**
     * Refund the entire held payment to the guest.
     *
     * This function does not decide whether the guest deserves a refund.
     * It only executes an already-approved financial decision.
     *
     * @param {Object} booking - The booking document whose payment will be refunded.
     * @returns {Promise<Object>} The updated booking document.
     */
    const refundHeldPayment = async (booking) => {
    // Ensure a booking document was provided
    if (!booking) {
        throw new Error("Booking is required to refund the payment.");
    }

    // A refund can only be processed while the money is still held
    if (booking.payment?.status !== "held") {
        throw new Error(
        `Payment cannot be refunded because its current status is ${booking.payment?.status}.`,
        );
    }

    // Use the actual amount paid by the guest
    const paidAmount = booking.payment.amount;

    // Ensure the stored payment amount is valid
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
        throw new Error(
        "The held payment amount is missing or invalid.",
        );
    }

    const now = new Date();

    // Mark the full payment as refunded
    booking.payment.status = "refunded";

    booking.payment.refundPercentage = 100;
    booking.payment.refundAmount = paidAmount;
    booking.payment.refundedAt = now;

    // No money was released to the host
    booking.payment.releasedAt = null;

    // A full refund means that neither the host nor the platform
    // receives earnings from this booking
    booking.payment.hostEarning = 0;
    booking.payment.platformCommission = 0;

    await booking.save();

    return booking;
    };

        /**
     * Refund part of the held payment to the guest
     * and release the remaining amount to the host.
     *
     * This function executes an already-approved financial decision.
     *
     * @param {Object} booking
     * @param {Number} refundPercentage
     * @returns {Promise<Object>}
     */
    const partialRefundHeldPayment = async (
    booking,
    refundPercentage,
    ) => {
    // Ensure a booking document was provided
    if (!booking) {
        throw new Error("Booking is required.");
    }

    // The payment must still be held
    if (booking.payment?.status !== "held") {
        throw new Error(
        `Payment cannot be partially refunded because its status is ${booking.payment?.status}.`,
        );
    }

    // Validate refund percentage
    if (
        !Number.isFinite(refundPercentage) ||
        refundPercentage <= 0 ||
        refundPercentage >= 100
    ) {
        throw new Error(
        "Refund percentage must be greater than 0 and less than 100.",
        );
    }

    // Amount originally paid by the guest
    const paidAmount = booking.payment.amount;

    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
        throw new Error(
        "Held payment amount is missing or invalid.",
        );
    }

    const refundAmount = Number(
        (
        paidAmount *
        (refundPercentage / 100)
        ).toFixed(2),
    );

    const remainingAmount = Number(
        (paidAmount - refundAmount).toFixed(2),
    );

    const PLATFORM_COMMISSION_RATE = 0.1;

    const platformCommission = Number(
        (
        remainingAmount *
        PLATFORM_COMMISSION_RATE
        ).toFixed(2),
    );

    const hostEarning = Number(
        (
        remainingAmount -
        platformCommission
        ).toFixed(2),
    );

    const now = new Date();

    booking.payment.status = "partially_refunded";

    booking.payment.refundPercentage = refundPercentage;
    booking.payment.refundAmount = refundAmount;
    booking.payment.refundedAt = now;

    booking.payment.platformCommission = platformCommission;
    booking.payment.hostEarning = hostEarning;

    booking.payment.releasedAt = now;

    await booking.save();

    return booking;
    };

    const Booking = require("../models/Booking");

    /**
     * Apply the financial decision after a dispute has been resolved.
     *
     * This function does not decide who wins the dispute.
     * It only executes the financial outcome that has already
     * been decided by the admin.
     *
     * @param {Object} dispute
     * @returns {Promise<Object>}
     */
    const applyDisputeResolution = async (dispute) => {
    if (!dispute) {
        throw new Error("Dispute is required.");
    }

    // Financial actions are allowed only after the dispute is resolved
    if (dispute.status !== "resolved") {
        throw new Error(
        "Financial resolution can only be applied to a resolved dispute.",
        );
    }

    // Load the related booking
    const booking = await Booking.findOne({
        _id: dispute.bookingId,
        isDeleted: false,
    });

    if (!booking) {
        throw new Error("Booking not found.");
    }

    switch (dispute.resolutionType) {
        case "release_payment":
        return await releaseHeldPayment(booking);

        case "full_refund":
        return await refundHeldPayment(booking);

        case "partial_refund":
        return await partialRefundHeldPayment(
            booking,
            dispute.refundPercentage,
        );

        default:
        throw new Error("Unsupported dispute resolution type.");
    }
    };

  return {
    foundCount: eligibleBookings.length,
    releasedCount,
    failedCount: failedBookings.length,
    failedBookings,
  };
};

module.exports = {
  releaseHeldPayment,
  refundHeldPayment,
  partialRefundHeldPayment,
  applyDisputeResolution,
  releaseEligiblePayments,
};