const Booking = require("../models/Booking");
const Dispute = require("../models/Dispute");

const PLATFORM_COMMISSION_RATE = 0.1;
const DISPUTE_WINDOW_HOURS = 24;

/**
 * Release one held payment to the host.
 *
 * This is an internal service function.
 * It is not called directly by the guest or host.
 *
 * @param {Object} booking - Mongoose booking document
 * @returns {Promise<Object>}
 */
const releaseHeldPayment = async (
  booking,
  excludedDisputeId = null,
) => {
  if (!booking) {
    throw new Error("Booking is required.");
  }

  if (booking.status !== "completed") {
    throw new Error(
      "Only completed bookings can release payment.",
    );
  }

  if (booking.payment?.status !== "held") {
    throw new Error(
      "Only held payments can be released.",
    );
  }

  const disputeFilter = {
    bookingId: booking._id,
    status: {
      $in: ["open", "in-progress"],
    },
  };

  if (excludedDisputeId) {
    disputeFilter._id = {
      $ne: excludedDisputeId,
    };
  }

  const activeDispute = await Dispute.findOne(disputeFilter);

  if (activeDispute) {
    throw new Error(
      "Payment cannot be released because another active dispute exists.",
    );
  }

  const paidAmount = booking.payment.amount;

  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw new Error(
      "The held payment amount is missing or invalid.",
    );
  }

  const platformCommission = Number(
    (paidAmount * PLATFORM_COMMISSION_RATE).toFixed(2),
  );

  const hostEarning = Number(
    (paidAmount - platformCommission).toFixed(2),
  );

  booking.payment.status = "released";
  booking.payment.platformCommission = platformCommission;
  booking.payment.hostEarning = hostEarning;
  booking.payment.refundPercentage = 0;
  booking.payment.refundAmount = 0;
  booking.payment.refundedAt = null;
  booking.payment.releasedAt = new Date();

  await booking.save();

  return booking;
};




/*
const releaseHeldPayment = async (booking) => {
  if (!booking) {
    throw new Error("Booking is required.");
  }

  // The stay must be completed before releasing its payment.
  if (booking.status !== "completed") {
    throw new Error("Only completed bookings can release payment.");
  }

  // The money must still be held by the platform.
  if (booking.payment?.status !== "held") {
    throw new Error("Only held payments can be released.");
  }

  // Do not release the payment while there is an active dispute.
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
*/

/**
 * Refund the entire held payment to the guest.
 *
 * This function does not decide whether the guest deserves a refund.
 * It only executes an already-approved financial decision.
 *
 * @param {Object} booking - Booking whose payment will be refunded
 * @returns {Promise<Object>}
 */
const refundHeldPayment = async (booking) => {
  if (!booking) {
    throw new Error("Booking is required to refund the payment.");
  }

    if (booking.status !== "completed") {
    throw new Error(
      "Only completed bookings can have their held payment refunded.",
    );
  }

  // A refund can only be processed while the payment is held.
  if (booking.payment?.status !== "held") {
    throw new Error(
      `Payment cannot be refunded because its current status is ${booking.payment?.status}.`,
    );
  }

  const paidAmount = booking.payment.amount;

  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw new Error("The held payment amount is missing or invalid.");
  }

  const now = new Date();

  booking.payment.status = "refunded";
  booking.payment.refundPercentage = 100;
  booking.payment.refundAmount = paidAmount;
  booking.payment.refundedAt = now;

  // Nothing was released to the host.
  booking.payment.releasedAt = null;
  booking.payment.hostEarning = 0;
  booking.payment.platformCommission = 0;

  await booking.save();

  return booking;
};

/**
 * Refund part of the held payment to the guest
 * and release the remaining amount to the host.
 *
 * @param {Object} booking
 * @param {Number} refundPercentage
 * @returns {Promise<Object>}
 */
const partialRefundHeldPayment = async (
  booking,
  refundPercentage,
) => {
  if (!booking) {
    throw new Error("Booking is required.");
  }

    if (booking.status !== "completed") {
    throw new Error(
      "Only completed bookings can have their held payment partially refunded.",
    );
  }

  if (booking.payment?.status !== "held") {
    throw new Error(
      `Payment cannot be partially refunded because its status is ${booking.payment?.status}.`,
    );
  }

  if (
    !Number.isFinite(refundPercentage) ||
    refundPercentage <= 0 ||
    refundPercentage >= 100
  ) {
    throw new Error(
      "Refund percentage must be greater than 0 and less than 100.",
    );
  }

  const paidAmount = booking.payment.amount;

  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw new Error("Held payment amount is missing or invalid.");
  }

  const refundAmount = Number(
    (paidAmount * (refundPercentage / 100)).toFixed(2),
  );

  const remainingAmount = Number(
    (paidAmount - refundAmount).toFixed(2),
  );

  // The platform commission is recalculated on the remaining amount,
  // not on the original payment amount.
  const platformCommission = Number(
    (remainingAmount * PLATFORM_COMMISSION_RATE).toFixed(2),
  );

  const hostEarning = Number(
    (remainingAmount - platformCommission).toFixed(2),
  );

  const now = new Date();

  booking.payment.status = "partially_refunded";
  booking.payment.refundPercentage = refundPercentage;
  booking.payment.refundAmount = refundAmount;
  booking.payment.refundedAt = now;

  booking.payment.platformCommission = platformCommission;
  booking.payment.hostEarning = hostEarning;

  // The remaining amount is considered released to the host.
  booking.payment.releasedAt = now;

  await booking.save();

  return booking;
};

/**
 * Execute the financial result of a resolved dispute.
 *
 * The Dispute module decides the outcome.
 * The Payment service only executes that decision.
 *
 * @param {Object} dispute - Resolved dispute document
 * @returns {Promise<Object>}
 */
const applyDisputeResolution = async (dispute) => {
  if (!dispute) {
    throw new Error("Dispute is required.");
  }

  if (dispute.status !== "resolved") {
    throw new Error(
      "Payment resolution can only be applied to a resolved dispute.",
    );
  }

  const resolutionType =
    dispute.resolutionType?.trim();

  console.log(
    "PAYMENT SERVICE RESOLUTION TYPE:",
    JSON.stringify(resolutionType),
  );

  const booking = await Booking.findOne({
    _id: dispute.bookingId,
    isDeleted: false,
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  switch (resolutionType) {
    case "noRefund":
      return releaseHeldPayment(
        booking,
        dispute._id,
      );

    case "fullRefund":
      return refundHeldPayment(booking);

    case "partialRefund":
      return partialRefundHeldPayment(
        booking,
        dispute.refundPercentage,
      );

    default:
      throw new Error(
        `Unsupported dispute resolution type: ${JSON.stringify(
          resolutionType,
        )}`,
      );
  }
};


/*
const applyDisputeResolution = async (dispute) => {
  if (!dispute) {
    throw new Error("Dispute is required.");
  }

  if (dispute.status !== "resolved") {
    throw new Error(
      "Payment resolution can only be applied to a resolved dispute.",
    );
  }

  const booking = await Booking.findOne({
    _id: dispute.bookingId,
    isDeleted: false,
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  switch (dispute.resolutionType) {
    case "releasePayment":
      return releaseHeldPayment(booking);

    case "fullRefund":
      return refundHeldPayment(booking);

    case "partialRefund":
      return partialRefundHeldPayment(
        booking,
        dispute.refundPercentage,
      );

    case "noRefund":
      // The guest is not entitled to any refund,
      // therefore the held payment is released to the host.
      return releaseHeldPayment(booking);

    default:
      throw new Error("Unsupported dispute resolution type.");
  }
};
*/

/**
 * Find completed bookings whose dispute window has ended
 * and release their held payments.
 *
 * @returns {Promise<Object>}
 */
const releaseEligiblePayments = async () => {
  const releaseThreshold = new Date(
    Date.now() - DISPUTE_WINDOW_HOURS * 60 * 60 * 1000,
  );

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