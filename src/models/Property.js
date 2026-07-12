const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "HostId is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    description: String,
    location: {
      type: {
        type: String,
        enum: ["Point"], // يجب أن تكون القيمة 'Point' حصراً
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // مصفوفة تحتوي على رقمين [خط الطول Longitude أولاً، ثم دائرة العرض Latitude]
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
    },
    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
    },
    cleaningFee: {
      type: Number,
      default: 0,
    },
    serviceFee: {
      type: Number,
      default: 0,
    },
    maxGuests: {
      type: Number,
      required: [true, "Max Guests is required"],
    },
    images: [String],
    status: {
      type: String,
      enum: ["available", "unavailable", "maintenance"],
      default: "available",
    },
    amenities: [String],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
propertySchema.index({ "location.coordinates": "2dsphere" });
module.exports = mongoose.model("Property", propertySchema);
