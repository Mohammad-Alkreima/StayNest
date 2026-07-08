const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String ,
    location: { 
        type: String,
        required: true
    },
    pricePerNight: { 
        type: Number,
        required: true 
    },
    cleaningFee: { 
        type: Number,
        default: 0 
    },
    serviceFee: { 
        type: Number, 
        default: 0 
    },
    maxGuests: { 
        type: Number, 
        required: true },
    images: [String],
    status: { 
        type: String, 
        enum: ["available", "unavailable", "maintenance"], 
        default: "available"
    },
    amenities: [String],
    isDeleted: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true 
});

module.exports = mongoose.model("Property", propertySchema);