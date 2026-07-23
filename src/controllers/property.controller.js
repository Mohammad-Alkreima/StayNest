const Booking = require("../models/Booking");
const Property = require("../models/Property");
class propertyController {
  createProperty = async (req, res) => {
    const hostId = req._user.id;

    const {
      title,
      description,
      location,
      pricePerNight,
      cleaningFee,
      serviceFee,
      maxGuests,
      images,
      status,
      amenities,
    } = req.body;

    if (!title || !location || !pricePerNight || !maxGuests) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: title, location, pricePerNight, and maxGuests are mandatory.",
      });
    }

    const cleanedTitle = title.trim();
    const cleanedLocation = location;
    const cleanedDescription = description ? description.trim() : "";

    if (cleanedTitle.length < 5 || cleanedTitle.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Title must be between 5 and 100 characters.",
      });
    }

    const parsedPrice = Number(pricePerNight);
    const parsedCleaningFee = Number(cleaningFee) || 0;
    const parsedServiceFee = Number(serviceFee) || 0;
    const parsedMaxGuests = Number(maxGuests);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price per night must be a positive number greater than 0.",
      });
    }
    if (
      isNaN(parsedCleaningFee) ||
      parsedCleaningFee < 0 ||
      isNaN(parsedServiceFee) ||
      parsedServiceFee < 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Fees cannot be negative values." });
    }
    if (
      isNaN(parsedMaxGuests) ||
      parsedMaxGuests < 1 ||
      !Number.isInteger(parsedMaxGuests)
    ) {
      return res.status(400).json({
        success: false,
        message: "Max guests must be a whole integer of at least 1.",
      });
    }

    if (images && !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        message: "Images must be sent as an array of URLs.",
      });
    }
    if (amenities && !Array.isArray(amenities)) {
      return res.status(400).json({
        success: false,
        message: "Amenities must be sent as an array of strings.",
      });
    }

    const allowedStatuses = ["available", "unavailable", "maintenance"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    const property = await Property.create({
      hostId,
      title: cleanedTitle,
      description: cleanedDescription,
      location: cleanedLocation,
      pricePerNight: parsedPrice,
      cleaningFee: parsedCleaningFee,
      serviceFee: parsedServiceFee,
      maxGuests: parsedMaxGuests,
      images: images || [],
      status: status || "available",
      amenities: amenities || [],
      isDeleted: false,
    });

    return res.status(201).json({
      success: true,
      message: "Property created successfully 🏡",
      data: property,
    });
  };
  getAllProperties = async (req, res) => {
    let filterObj = { isDeleted: false, status: "available" };

    const allowedFilters = [
      "title",
      "location",
      "minPrice",
      "maxPrice",
      "maxGuests",
      "amenities",
      "status",
      "lng",
      "lat",
      "distance",
    ];

    const safeQuery = {};
    for (const key in req.query) {
      if (allowedFilters.includes(key)) {
        safeQuery[key] =
          typeof req.query[key] === "string"
            ? req.query[key].trim()
            : req.query[key];
      }
    }

    if (safeQuery.lng && safeQuery.lat) {
      const longitude = Number(safeQuery.lng);
      const latitude = Number(safeQuery.lat);

      const maxDistanceInMeters = (Number(safeQuery.distance) || 10) * 1000;

      if (!isNaN(longitude) && !isNaN(latitude)) {
        filterObj["location.coordinates"] = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            $maxDistance: maxDistanceInMeters,
          },
        };
      }
    } else if (safeQuery.location && typeof safeQuery.location === "string") {
      const sanitizedLocation = safeQuery.location.replace(
        /[-\/\\^$*+?.()|[\]{}]/g,
        "\\$&",
      );
      filterObj["location.address"] = new RegExp(sanitizedLocation, "i");
    }

    if (safeQuery.title && typeof safeQuery.title === "string") {
      const sanitizedTitle = safeQuery.title.replace(
        /[-\/\\^$*+?.()|[\]{}]/g,
        "\\$&",
      );
      filterObj.title = new RegExp(sanitizedTitle, "i");
    }

    if (safeQuery.minPrice || safeQuery.maxPrice) {
      filterObj.pricePerNight = {};
      if (safeQuery.minPrice) {
        const min = Number(safeQuery.minPrice);
        if (!isNaN(min) && min >= 0) filterObj.pricePerNight.$gte = min;
      }
      if (safeQuery.maxPrice) {
        const max = Number(safeQuery.maxPrice);
        if (!isNaN(max) && max > 0) filterObj.pricePerNight.$lte = max;
      }
      if (Object.keys(filterObj.pricePerNight).length === 0) {
        delete filterObj.pricePerNight;
      }
    }

    if (safeQuery.maxGuests) {
      const guests = Number(safeQuery.maxGuests);
      if (!isNaN(guests) && guests > 0) {
        filterObj.maxGuests = { $gte: guests };
      }
    }

    if (safeQuery.amenities && typeof safeQuery.amenities === "string") {
      const amenitiesArray = safeQuery.amenities
        .split(",")
        .map((item) => item.trim());
      filterObj.amenities = { $all: amenitiesArray };
    }

    let sortBy = "-createdAt";
    if (req.query.sort && typeof req.query.sort === "string") {
      const allowedSortFields = [
        "pricePerNight",
        "-pricePerNight",
        "createdAt",
        "-createdAt",
      ];
      if (allowedSortFields.includes(req.query.sort)) {
        sortBy = req.query.sort;
      }
    }

    const properties = await Property.find(filterObj)
      .populate("hostId", "name email")
      .sort(sortBy);

    return res.status(200).json({
      success: true,
      count: properties.length,
      message: "Properties retrieved successfully based on your criteria 🔍🏡",
      data: properties,
    });
  };
  getPropertyById = async (req, res) => {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Property ID format." });
    }
    // نجلب العقار بشرط ألا يكون محذوفاً ناعماً
    const property = await Property.findOne({
      _id: id,
      isDeleted: false,
    }).populate("hostId", "name email");

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found or has been removed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property details retrieved ",
      data: property,
    });
  };
  updateProperty = async (req, res) => {
    const { id } = req.params;
    const currentUserId = req._user.id;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Property ID format." });
    }
    let property = await Property.findOne({ _id: id, isDeleted: false });
    if (!property) {
      return res
        .status(404)
        .json({ success: false, message: "Property not found." });
    }
    if (property.hostId.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "Access Denied. You are not the host of this property.",
      });
    }

    const updates = req.body;
    delete updates.hostId;
    delete updates.isDeleted;

    if (
      updates.pricePerNight &&
      (isNaN(Number(updates.pricePerNight)) ||
        Number(updates.pricePerNight) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Updated price must be a positive number.",
      });
    }

    property = await Property.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Property updated successfully ✅",
      data: property,
    });
  };
  deleteProperty = async (req, res) => {
    const { id } = req.params;
    const currentUserId = req._user.id;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Property ID format." });
    }

    const property = await Property.findOne({ _id: id, isDeleted: false });
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found or already deleted.",
      });
    }

    if (property.hostId.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "Access Denied. You cannot delete this property.",
      });
    }

    const today = new Date();

    const activeOrFutureBooking = await Booking.findOne({
      propertyId: id,
      status: { $nin: ["cancelled", "rejected"] },
      endDate: { $gte: today },
    });

    if (activeOrFutureBooking) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete this property. There are active or upcoming bookings associated with it.",
      });
    }

    property.isDeleted = true;
    property.status = "unavailable";
    await property.save();

    return res.status(200).json({
      success: true,
      message: "Property archived and unlisted successfully 🗑️🏡",
    });
  };
}

module.exports = new propertyController();
