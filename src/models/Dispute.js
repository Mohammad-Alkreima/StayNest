const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: [true, "BookingId is required"]
    },
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "UserId is required"]
    }, // من قدم الشكوى
    reason: {
        type: String,
        required: [true, "Reason is required"]
    }, // سبب النزاع
    status: {
        type: String,
        enum: ["open", "in-progress", "resolved"],
        default: "open"
    },
    adminNotes:String // ملاحظات الـ Super Admin
}, {
    timestamps: true
});

module.exports = mongoose.model("Dispute", disputeSchema);