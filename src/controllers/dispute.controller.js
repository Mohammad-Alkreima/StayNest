const Dispute = require("../models/Dispute");
const Booking = require("../models/Booking");
//const Property = require("../models/Property");
const User = require("../models/User");
const {
  applyDisputeResolution,
} = require("../services/payment.service");

class DisputeController {
  getAllDisputes = async (req, res) => {
    const limit = req._limit;
    const page = req._page;
    const skip = (page - 1) * limit;
    const totalDisputes = await Dispute.countDocuments();
    const pages = Math.ceil(totalDisputes / limit);
    const disputes = await Dispute.find()
        .populate("bookingId")
        .populate("reporterId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return res.status(200).json({
        message: "Get All Disputes",
        disputes,
        page,
        pages,
        totalDisputes
    });
  }

  getDisputeById = async (req, res) => {
    const { disputeId } = req.params;

    const dispute = await Dispute.findById(disputeId);

    if (!dispute) {
      return res
        .status(404)
        .json({ success: false, message: "The dispute does not exsist" });
    }

    res.status(200).json({
      success: true,
      message: "Get disput by id successfully",
      data: dispute,
    });
  };

  createDispute = async (req, res) => {
    //console.log("USER FROM REQ:", req._user);
    const { bookingId, reason } = req.body;
    const reporterId = req._user.id;
    // 1. Retrieve the booking along with the related property
    // to determine the property host.
    const booking = await Booking.findById(bookingId).populate("propertyId");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
    }

    // 2. Ensure that only completed bookings can have disputes opened.
    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "A dispute can only be opened for completed bookings.",
      });
    }

    // A dispute can only be opened while the completed booking payment
    // is still held by the platform.
    if (booking.payment?.status !== "held") {
      return res.status(409).json({
        success: false,
        message:
          "A dispute cannot be opened because the payment for this booking is no longer held by the platform.",
      });
    }

    // Ensure that the booking has a valid completion timestamp.
    if (!booking.completedAt) {
      return res.status(409).json({
        success: false,
        message:
          "A dispute cannot be opened because the booking completion time is missing.",
      });
    }

    // The parties have 24 hours after completion to open a dispute.
    const disputeWindowInMilliseconds = 24 * 60 * 60 * 1000;
    const disputeDeadline = new Date(
      booking.completedAt.getTime() + disputeWindowInMilliseconds,
    );

    if (new Date() > disputeDeadline) {
      return res.status(400).json({
        success: false,
        message:
          "The dispute window has expired. Disputes can only be opened within 24 hours after the booking is completed.",
      });
    }

    // 3. Automatically determine the dispute parties and dispute type.
    const hostId = booking.propertyId.hostId.toString();
    const guestId = booking.guestId.toString();

    let targetId, type;

    if (reporterId === guestId) {
      targetId = hostId;
      type = "guest-to-host";
    } else if (reporterId === hostId) {
      targetId = guestId;
      type = "host-to-guest";
    } else {
      return res.status(403).json({
        success: false,
        message:
           "You are not allowed to open a dispute for this booking because you are not one of its parties.",
      });
    }

    // 4. Ensure that the same user has not already opened
    // a dispute for this booking.
    const existingDispute = await Dispute.findOne({ bookingId, reporterId });
    if (existingDispute) {
      return res.status(400).json({
        success: false,
        message:
          "You have already opened a dispute for this booking.",
      });
    }

    // 5. Create the dispute with the default initial status (open).
    const newDispute = await Dispute.create({
      bookingId,
      reporterId,
      targetId,
      type,
      reason,
      status: "open",
    });

    res.status(201).json({
      success: true,
      message:
          "The dispute has been created successfully and is now under administrative review.",
      data: newDispute,
    });
  };

  updateDispute = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req._user.id;

    // 1. Find the dispute.
    const dispute = await Dispute.findById(id);

    if (!dispute) {
      return res
        .status(404)
        .json({ success: false, message: "Dispute not found." });
    }

    // 2. Ensure that only the dispute reporter can update it.
    if (dispute.reporterId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message:
           "You are not allowed to update a dispute that you did not create.",
      });
    }

    // 3. Allow updates only while the dispute is still open.
    if (dispute.status !== "open") {
      return res.status(400).json({
        success: false,
        message:
           "The dispute reason can no longer be updated because the dispute is no longer open.",
      });
    }

    // 4. Update only the dispute reason.
    dispute.reason = reason;
    await dispute.save();

    res.status(200).json({
      success: true,
      message:
         "The dispute reason has been updated successfully.",
      data: dispute,
    });
  };

  resolveDispute = async (req, res) => {
    const { id } = req.params;
    const {
      status,
      winner,
      resolutionType,
      refundPercentage,
      refundAmount,
      adminNotes,
    } = req.body;

    // 1. Retrieve the dispute to ensure it exists.
    const dispute = await Dispute.findById(id);

    if (!dispute) {
      return res
        .status(404)
        .json({ success: false, message: "Dispute not found." });
    }

    // Prevent resolving the same dispute and executing its payment twice.
    if (dispute.status === "resolved") {
      return res.status(400).json({
        success: false,
        message:
          "This dispute has already been resolved.",
      });
    }

    // 2. Update the dispute with the admin's decision and settlement details.
    dispute.status = status; // resolved, rejected, in-progress, etc.
    dispute.winner = winner || null;
    dispute.resolutionType = resolutionType || null;
    dispute.refundPercentage = refundPercentage ?? null;
    dispute.refundAmount = refundAmount ?? null;
    if (adminNotes) dispute.adminNotes = adminNotes;

    await dispute.save();
    // Execute the financial result only after the dispute is resolved.
    if (dispute.status === "resolved") {
      await applyDisputeResolution(dispute);
    }

    // 3. Return a successful response after updating the dispute.
    res.status(200).json({
      success: true,
      message:
         "The dispute resolution has been updated successfully.",
      data: dispute,
    });
  };

  filterDisputes = async (req, res) => {
    const limit = req._limit;
    const page = req._page;
    const skip = (page - 1) * limit;

    const { name, type, status } = req.query;
    const user = await User.findOne({
        name: {
            $regex: name,
            $options: "i"
        }
    });

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    let bookingFilter = {};

    if (type === "host") {
        bookingFilter.hostId = user._id;
    }

    if (type === "guest") {
        bookingFilter.guestId = user._id;
    }

    const bookings = await Booking.find(bookingFilter);

    const bookingIds = bookings.map((booking) => booking._id);

    let disputeFilter = {
        bookingId: {
            $in: bookingIds
        }
    };

    if (status) {
        disputeFilter.status = status;
    }

    const totalDisputes =
        await Dispute.countDocuments(disputeFilter);

    const pages = Math.ceil(totalDisputes / limit);

    const disputes = await Dispute.find(disputeFilter)
        .populate("bookingId")
        .populate("reporterId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return res.status(200).json({
        message: "Filtered Disputes",
        disputes,
        totalDisputes,
        page,
        pages
    });
  };

}
module.exports = new DisputeController();
