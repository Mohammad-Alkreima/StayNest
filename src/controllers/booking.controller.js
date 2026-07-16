const Booking = require("../models/Booking");
const Property = require("../models/Property");

class BookingController {

    createBooking = async (req, res) => {
        const guestId = req._user.id;
        const { propertyId, startDate, endDate, paymentMethod } = req.body;

        const start = new Date(startDate);
        const end = new Date(endDate);

        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        // Check if property exists
        const property = await Property.findOne({
            _id: propertyId,
            isDeleted: false,
        });

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found.",
            });
        }

        // Check property availability
        if (property.status !== "available") {
            return res.status(400).json({
                success: false,
                message: "Property not available.",
            });
        }

        // Prevent the host from booking his own property
        if (property.hostId.toString() === guestId) {
            return res.status(403).json({
                success: false,
                message: "Cannot book your own property.",
            });
        }

        // Check overlapping bookings
        const overlap = await Booking.findOne({
            propertyId,
            isDeleted: false,
            status: { $in: ["pending", "confirmed"] },
            startDate: { $lt: end },
            endDate: { $gt: start },
        });

        if (overlap) {
            return res.status(409).json({
                success: false,
                message: "Dates overlap with existing booking.",
            });
        }

        // Calculate number of nights
        const numberOfNights = Math.round(
            (end - start) / (1000 * 60 * 60 * 24)
        );

        if (numberOfNights < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid duration.",
            });
        }

        // Calculate prices
        const subtotal =
            numberOfNights * property.pricePerNight;

        const totalPrice =
            subtotal +
            (property.cleaningFee || 0) +
            (property.serviceFee || 0);

        // Create booking
        const booking = await Booking.create({
            propertyId,
            hostId: property.hostId,
            guestId,
            startDate: start,
            endDate: end,
            numberOfNights,
            pricePerNightAtBooking: property.pricePerNight,
            cleaningFeeAtBooking: property.cleaningFee || 0,
            serviceFeeAtBooking: property.serviceFee || 0,
            subtotal,
            totalPrice,
            paymentMethod: paymentMethod || "bankTransfer",
        });

        return res.status(201).json({
            success: true,
            message: "Booking created successfully.",
            data: booking,
        });
    };


    getHostBookings = async (req, res) => {
        const hostId = req._user.id;

        const bookings = await Booking.find({
            hostId,
            isDeleted: false,
        })
            .populate("propertyId", "title location")
            .populate("guestId", "name email")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings,
        });
    };
}

module.exports = new BookingController();