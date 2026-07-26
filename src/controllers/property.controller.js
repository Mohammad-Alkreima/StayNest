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
      amenities,
      verificationDocuments
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
      amenities: amenities || [],
      isDeleted: false,
      verificationDocuments,
      isVerified: false
    });

    return res.status(201).json({
      success: true,
      message: "the property has been created, must be waiting to review the documents",
      data: property,
    });
  };

  getAllProperties = async (req, res) => {
    let filterObj = { isDeleted: false, isVerified: true };

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

  verifyProperty = async (req, res) => {
    const { propertyId, status, rejectionReason } = req.body;

    let updateData = {};

    if (status === "approved") {
        updateData.isVerified = true;
        updateData.statusVerified = "approved";
        updateData.status = "available";
        updateData.reasonRejected = null;
    } else if (status === "rejected") {
        updateData.isVerified = false;
        updateData.statusVerified = "rejected";
        updateData.status = "unavailable";
        updateData.reasonRejected = rejectionReason || "the admin didnot write the resoan";
    } else {
        return res.status(400).json({ message: "Invalid status value." });
    }

    //We only update if it has not been previously documented and has not been previously rejected.
    const property = await Property.findOneAndUpdate(
        { 
          _id: propertyId, 
          isVerified: { $ne: true },          // didnot verified before
          statusVerified: { $ne: "rejected" }  // didnot rejected before
        },
        updateData,
        { new: true }
    )
    .populate({ path: "hostId", select: "name phone profileImage" })
    .select("title description images location.address isVerified statusVerified reasonRejected status");

    // if null => property does not exsist or it is verified or rejected before
    if (!property) {
        return res.status(400).json({ 
          message: "Property not found, or it has already been verified/rejected before." 
        });
    }

    res.status(200).json({
        message: status === "approved" ? "verified successed and posted your property" : "rejected the property",
        property
    });
  };

  getPropertyById = async (req, res) => {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Property ID format." });
    }
    
    const property = await Property.findOne({
      _id: id,
      isDeleted: false,
      isVerified: true
    }).populate("hostId", "name email");

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found or has been removed, or has not yet been documented.",
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
      return res.status(400).json({ success: false, message: "Invalid Property ID format." });
    }

    let property = await Property.findOne({ _id: id, isDeleted: false });
    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found." });
    }

    if (property.hostId.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "Access Denied. You are not the host of this property.",
      });
    }

    const updates = req.body;
    
    // Protecting sensitive fields so that the host does not change them itself
    delete updates.hostId;
    delete updates.isDeleted;
    delete updates.isVerified;
    delete updates.statusVerified;
    delete updates.resoanRejected;

    // check the price is valid
    if (
      updates.pricePerNight &&
      (isNaN(Number(updates.pricePerNight)) || Number(updates.pricePerNight) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Updated price must be a positive number.",
      });
    }

    // if host update primary details or douments => property will be unavailable and admin must be checking again
    const criticalFieldsChanged = updates.verificationDocuments || updates.title || updates.location || updates.pricePerNight;
    
    if (criticalFieldsChanged) {
        updates.isVerified = false;
        updates.statusVerified = null;
        updates.status = "unavailable";
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
      message: criticalFieldsChanged 
        ? "Property updated successfully, and it has been sent back to admin for re-verification." 
        : "Property updated successfully",
      data: property,
    });
  };

  deleteProperty = async (req, res) => {
    const { id } = req.params;
    const currentUserId = req._user.id;
    const currentUserRole = req._user.role;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400)
        .json({ success: false, message: "Invalid Property ID format." });
    }

    const property = await Property.findOne({ _id: id, isDeleted: false });
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found or already deleted.",
      });
    }

    // allow host and admin to delete property
    if (property.hostId.toString() !== currentUserId && currentUserRole !== "admin") {
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
        message: "Cannot delete this property. There are active or upcoming bookings associated with it.",
      });
    }

    // Update fields when deleted the property
    property.isDeleted = true;
    property.status = "unavailable";
    property.isVerified = false; // Remove the verification to ensure it never appears again.
    await property.save();

    return res.status(200).json({
      success: true,
      message: "Property archived and unlisted successfully",
    });
  };
}

module.exports = new propertyController();
