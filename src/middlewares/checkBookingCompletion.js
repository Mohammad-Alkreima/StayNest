const Booking = require('../models/Booking');

const checkBookingCompletion = async (req, res, next) => {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId).populate({
        path: "propertyId",
        select: "hostId"
    });

    if (!booking) return res.status(404).json({ message: "booking does not exsist" });

    // chexk status is complete and endDated is passed
    if (booking.status !== 'completed' || new Date(booking.endDate) > new Date()) {
        return res.status(400).json({ message: "can not rating this booking before finsihed" });
    }

    req.booking = booking; // passed details booking to controller
    console.log(req.booking)
    next();
};

module.exports = checkBookingCompletion;