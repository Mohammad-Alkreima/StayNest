const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    bookingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Booking", 
        required: [true, "BookingId is required"] 
    },
    rating: { 
        type: Number, 
        min: 1, 
        max: 5, 
        required: [true, "Reting is required"] 
    },
    comment: String ,
    isVisible: {
        type: Boolean, 
        default: false
    },
    visibleFrom: Date,
    reviewerRole: {
        type: String,
        enum: ["guestToHost", "hostToGuest"],
        required: true
    },
    reviewerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        ref: "User"
    },
    reports: [{
        reportedBy: { 
            type: mongoose.Schema.Types.ObjectId,
            ref: "User" 
        },
        reason: { 
            type: String, 
            required: true 
        },
        status: { 
            type: String, 
            enum: ["pending", "resolved", "dismissed"], 
            default: "pending" },
        createdAt: { 
            type: Date, 
            default: Date.now }
    }],
    isFlagged: { 
        type: Boolean, 
        default: false 
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Review", reviewSchema);