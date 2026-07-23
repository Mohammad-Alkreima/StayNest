const { default: mongoose } = require("mongoose");
const Review = require("../models/Review");
const Property = require("../models/Property");
const Booking = require("../models/Booking");

const getReviewPopulateOptions = () => [
    {
        path: "bookingId",
        select: "totalPrice",
        populate: { path: "propertyId", select: "title" }
    },
    {
        path: "reviewerId",
        select: "name"
    }
];

class ReviewContoller {
    addReview = async(req, res) => {
        console.log("Booking object:", req.booking);
        const { bookingId, rating, comment, reviewerRole } = req.body;
        const reviewerId = req._user.id;

        // ensure if this user has rating
        const existingReview = await Review.findOne({ bookingId, reviewerId });
        if (existingReview) {
            return res.status(400).json({ message: "you are create ratinf for this booking before" });
        };

        if (reviewerRole === "guestToHost" && reviewerId !== req.booking.guestId.toString()) {
            return res.status(403).json({ message: "You are not guest in this booking" });
        };
        if (reviewerRole === "hostToGuest" && reviewerId !== req.booking.hostId.toString()) {
            return res.status(403).json({ message: "You are not host in this booking" });
        };

        // create review
        const review = await Review.create({
            bookingId,
            reviewerId, // guest or host
            rating,
            comment,
            reviewerRole,
            isVisible: false 
        });

        // Check mutual evaluation status
        // Has the other party already written their review?
        const oppositeRole = reviewerRole === "guestToHost" ? "hostToGuest" : "guestToHost";
        const oppositeReview = await Review.findOne({ bookingId, reviewerRole: oppositeRole });

        if (oppositeReview) {
            // if true will update review and make it isVisible: true
            await Review.updateMany({ bookingId }, { isVisible: true });
        } else {
            // if false will be {isVisible: true} after 14 days
            const autoVisibleDate = new Date();
            autoVisibleDate.setDate(autoVisibleDate.getDate() + 14);
            
            await Review.updateOne({ _id: review._id }, { visibleFrom: autoVisibleDate });
        }

        res.status(201).json({ 
            message: "your rating has been completed, will be avaliable when the opposite user write his review" 
        });
    };

    getAllReviews = async (req, res) => {
        const query = {};
        
        // only amdin can see all reviews including isVisible: fale
        const isAdmin = req._user?.role === "admin";
        if (!isAdmin) {
            query.isVisible = true;
        }

        const limit = req._limit;
        const page = req._page;
        const skip = (page-1) * limit;
        const totalReviews = await Review.find(query).countDocuments();
        const pages = Math.ceil(totalReviews/limit);
        const reviews = await Review.find(query)
                                    .populate({
                                        path: "reviewerId",
                                        select: "name role"
                                    })
                                    .skip(skip).limit(limit);
        return res.status(200).json({
            message: "Get All Reviews",
            reviews,
            page, pages, totalReviews
        });
    };

    getReviewById = async (req, res) => {
        const query = { _id: req.params.id };
        
        // only admin see all reviews
        const isAdmin = req._user?.role === "admin";
        if (!isAdmin) {
            query.isVisible = true;
        }

        const review = await Review.findOne(query).populate(getReviewPopulateOptions());
        
        if (!review) {
            return res.status(404).json({ message: "The review does not exsist or noo avaliable now" });
        }
        
        res.status(200).json(review);
    };

    getReviewsByProperty = async (req, res) => {
        const id = req.params.id;
        const query = { isVisible: true };

        if (req._user?.role === "admin") {
            delete query.isVisible;
        }

        const reviews = await Review.find(query)
            .populate({
                path: "bookingId",
                match: { propertyId: id },
                select: "totalPrice propertyId",
                populate: { path: "propertyId", select: "title" }
            })
            .populate({ path: "reviewerId", select: "name" });

        const filteredReviews = reviews.filter(r => r.bookingId !== null);

        // Average Rating
        let averageRating = 0;
        if (filteredReviews.length > 0) {
            const totalSum = filteredReviews.reduce((acc, curr) => acc + curr.rating, 0);
            averageRating = totalSum / filteredReviews.length;
        }

        res.status(200).json({
            message: "rating this property",
            averageRating: parseFloat(averageRating.toFixed(1)),
            totalReviews: filteredReviews.length, // num of rating
            reviews: filteredReviews
        });
    };

    getAllPropertiesWithReviews = async (req, res) => {
        const limit = req._limit;
        const page = req._page;
        const skip = (page-1) * limit;
        const totalProperties = await Property.countDocuments({ isDeleted: false });
        const pages = Math.ceil(totalProperties/limit);

        // bring properties
        const properties = await Property.find({ isDeleted: false })
                                        .select("title images location.address")
                                        .skip(skip)
                                        .limit(limit);

        const propertiesWithData = await Promise.all(properties.map(async (property) => {
            
            // Bring all booking for this property with rating
            const bookings = await Booking.find({ propertyId: property._id })
                .populate({
                    path: "reviews",
                    match: req._user?.role === "admin" ? {} : { isVisible: true },
                    select: "rating comment reviewerId"
                });

            // merage all rating from all rating in array
            const allReviews = bookings.flatMap(b => b.reviews);
            
            // avg
            const avgRating = allReviews.length > 0 
                ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length 
                : 0;

            return {
                ...property.toObject(),
                averageRating: avgRating.toFixed(1),
                totalReviews: allReviews.length,
                reviews: allReviews
            };
        }));

        res.status(200).json({
            message: "Get All Properties",
            properties: propertiesWithData, page, pages, totalProperties
        });
    };

    updateReview = async (req, res) => {
        const id = req.params.id;
        const userId = req._user.id;

        const review = await Review.findById(id);
        if(!review) {
            return res.status(404).json({
                message: "this review does not exsist"
            })
        };

        if(review.reviewerId.toString() !== userId) {
            return res.status(403).json({
                message: "you do not have authorized to update review"
            })
        };

        if(review.isVisible) {
            return res.status(400).json({
                message: "you can not update your review beacuse it is visible to all users"
            })
        };

        const { rating, comment } = req.body;

        review.rating = rating || review.rating;
        review.comment = comment || review.comment;
        await review.save();

        return res.status(200).json({
            message: "update review successfully"
        });
    };

    reportReview = async(req, res) => {
        const id = req.params.id;
        const {reason} = req.body;
        const reportId = req._user.id;

        const review = await Review.findById(id);
        if(!review) {
            return res.status(404).json({
                message: "the rating does not exsist"
            })
        };

        const alreadyReported = review.reports.find((report) => {
            return report.reportedBy.toString() === reportId
        });
        if(alreadyReported) {
            return res.status(400).json({
                message: "you already reported this rating"
            })
        };

        // add report
        review.reports.push({
            reportedBy: reportId,
            reason: reason,
            status: "pending"
        });
        review.isFlagged = true;
        review.isVisible = false;

        await review.save();

        await Review.updateMany(
            { bookingId: review.bookingId, _id: {$ne: id} },
            { $set: { isVisible: false } }
        );

        return res.status(200).json({
            message: "your report send suucessfully, and managment will review it"
        })
    };

    handleReport = async(req, res) => {
        const id = req.params.id;
        const { reportId, action } = req.body;

        const review = await Review.findById(id);
        if(!review) {
            return res.status(404).json({
                message: "the rating does not exsist"
            })
        };

        if(action === "delete") {
            const reviewToDelete = await Review.findById(id);
            const bookingId = reviewToDelete.bookingId;

            // delete review
            await Review.findByIdAndDelete(id);

            // update rating
            await Review.updateMany(
                { bookingId: bookingId },
                { isVisible: false }
            );

            return res.status(200).json({ message: "deleted your rating and hide rating another user" });
        };

        if (action === "dismiss") {
            const result = await Review.updateOne(
                { _id: id }, // 
                { 
                    $set: { "reports.$[elem].status": "dismissed" } 
                },
                { 
                    arrayFilters: [{ "elem._id": new mongoose.Types.ObjectId(reportId) }] 
                }
            );

            //  if true => there is any review
            if (result.matchedCount === 0) {
                return res.status(404).json({ message: "the review does not exsist" });
            }

            // ckeck review
            const updatedReview = await Review.findById(id);
            
            // ensure if updatedReview is exsisting 
            if (!updatedReview) return res.status(404).json({ message: "rating does not exsisting" });

            const hasOtherPending = updatedReview.reports.some(report => report.status === "pending");
            
            if (!hasOtherPending) {
                updatedReview.isFlagged = false;
                updatedReview.isVisible = true; 
                await updatedReview.save();

                // display rating for host, guest
                await Review.updateMany(
                    { bookingId: updatedReview.bookingId, _id: { $ne: id } },
                    { $set: { isVisible: true } }
                );
            }

            return res.status(200).json({ message: "blocked the review, and display the rating" });
        }

        return res.status(400).json({ message: "process not valid" });
    }   
}

module.exports = new ReviewContoller();