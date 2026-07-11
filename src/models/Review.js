const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    bookingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Booking", 
        required: [true, "BookingId is required"] 
    },
    guestId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: [true, "GuestId is required"] 
    },
    hostId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: [true, "Host Id is required"] 
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
    visibleFrom: Date
}, {
    timestamps: true
});

module.exports = mongoose.model("Review", reviewSchema);