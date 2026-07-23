const Dispute = require("../models/Dispute");
const Booking = require("../models/Booking");
const Property = require("../models/Property");
const User = require("../models/User");

class DisputeController {


  getAllDisputes = async (req, res) => {
    const limit = req._limit;
    const page = req._page;
    const skip = (page - 1) * limit;
    const totalDisputes = await Dispute.countDocuments();
    const pages = Math.ceil(totalDisputes / limit);
    const disputes = await Dispute.find()
        .populate("bookingId")
        .populate("reporterId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return res.status(200).json({
        message: "Get All Disputes",
        disputes,
        page,
        pages,
        totalDisputes
    });
  }


  createDispute = async (req, res) => {
    console.log("USER FROM REQ:", req._user);
    const { bookingId, reason } = req.body;
    const reporterId = req._user.id;
    // 1. جلب بيانات الحجز مع بيانات العقار لمعرفة من هو المضيف
    const booking = await Booking.findById(bookingId).populate("propertyId");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "الحجز غير موجود" });
    }

    // 2. التحقق من شرط أن الحجز "مكتمل" حصراً لفتح النزاع
    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "لا يمكن فتح نزاع إلا للحجوزات المكتملة فقط",
      });
    }

    // 3. تحديد الأطراف ونوع النزاع تلقائياً
    const hostId = booking.propertyId.hostId.toString();
    const guestId = booking.guestId.toString();

    let targetId, type;

    if (reporterId === guestId) {
      targetId = hostId;
      type = "guest-to-host";
    } else if (reporterId === hostId) {
      targetId = guestId;
      type = "host-to-guest";
    } else {
      return res.status(403).json({
        success: false,
        message: "غير مسموح لك بفتح نزاع على هذا الحجز لعدم كونك أحد طرفيه",
      });
    }

    // 4. التأكد من عدم وجود نزاع مسبق مفتوح لنفس الحجز من نفس الشخص (اختياري لزيادة الموثوقية)
    const existingDispute = await Dispute.findOne({ bookingId, reporterId });
    if (existingDispute) {
      return res.status(400).json({
        success: false,
        message: "لقد قمت بفتح نزاع مسبقاً لهذا الحجز",
      });
    }

    // 5. إنشاء النزاع بالحالة الافتتاحية (open) والحقول الجديدة بقيمها الافتراضية
    const newDispute = await Dispute.create({
      bookingId,
      reporterId,
      targetId,
      type,
      reason,
      status: "open",
    });

    res.status(201).json({
      success: true,
      message: "تم فتح النزاع بنجاح وهو قيد المراجعة من الإدارة",
      data: newDispute,
    });
  };
  updateDispute = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req._user.id;

    // 1. البحث عن النزاع
    const dispute = await Dispute.findById(id);

    if (!dispute) {
      return res
        .status(404)
        .json({ success: false, message: "النزاع غير موجود" });
    }

    // 2. التحقق من أن المستخدم هو صاحب الشكوى حصراً
    if (dispute.reporterId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "غير مسموح لك بتعديل شكوى لم تقم بتقديمها",
      });
    }

    // 3. التحقق من أن الشكوى في حالة "open" فقط (يُمنع التعديل في in-progress أو resolved أو غيرها)
    if (dispute.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "عذراً، لا يمكن تعديل سبب الشكوى لأن حالتها لم تعد مفتوحة",
      });
    }

    // 4. تحديث السبب فقط
    dispute.reason = reason;
    await dispute.save();

    res.status(200).json({
      success: true,
      message: "تم تحديث سبب الشكوى بنجاح",
      data: dispute,
    });
  };

  resolveDispute = async (req, res) => {
    const { id } = req.params;
    const {
      status,
      winner,
      resolutionType,
      refundPercentage,
      refundAmount,
      adminNotes,
    } = req.body;

    // 1. جلب النزاع للتأكد من وجوده
    const dispute = await Dispute.findById(id);

    if (!dispute) {
      return res
        .status(404)
        .json({ success: false, message: "النزاع غير موجود" });
    }

    // 2. تحديث بيانات النزاع بقرار الآدمن والتسوية
    dispute.status = status; // resolved, rejected, in-progress, etc.
    dispute.winner = winner || null;
    dispute.resolutionType = resolutionType || null;
    dispute.refundPercentage = refundPercentage || null;
    dispute.refundAmount = refundAmount || null;
    if (adminNotes) dispute.adminNotes = adminNotes;

    await dispute.save();

    // 3. الرد بنجاح العملية دون أي قيود أو حظر تلقائي
    res.status(200).json({
      success: true,
      message: "تم تحديث قرار الشكوى والتسوية بنجاح",
      data: dispute,
    });
  };

  filterDisputes = async (req, res) => {

    const limit = req._limit;
    const page = req._page;
    const skip = (page - 1) * limit;

    const { name, type, status } = req.query;
    const user = await User.findOne({
        name: {
            $regex: name,
            $options: "i"
        }
    });

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }


    let bookingFilter = {};

    if (type === "host") {
        bookingFilter.hostId = user._id;
    }

    if (type === "guest") {
        bookingFilter.guestId = user._id;
    }

    const bookings = await Booking.find(bookingFilter);

    const bookingIds = bookings.map((booking) => booking._id);


    let disputeFilter = {
        bookingId: {
            $in: bookingIds
        }
    };

    if (status) {
        disputeFilter.status = status;
    }


    const totalDisputes =
        await Dispute.countDocuments(disputeFilter);

    const pages = Math.ceil(totalDisputes / limit);


    const disputes = await Dispute.find(disputeFilter)
        .populate("bookingId")
        .populate("reporterId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);


    return res.status(200).json({

        message: "Filtered Disputes",

        disputes,

        totalDisputes,

        page,

        pages

    });

};

}




module.exports = new DisputeController();