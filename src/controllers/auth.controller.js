const Booking = require("../models/Booking");
const Property = require("../models/Property");
const User = require("../models/User");
const cookiesService = require("../utils/cookiesService");
const jwtService = require("../utils/jwtService");
const passwordService = require("../utils/passwordService");

class AuthController {
    handleFailedLoginAttempts = async (user) => {
        user.failedLoginAttempts = +(user.failedLoginAttempts || 0) + 1;

        if(user.failedLoginAttempts >= 5) {
            user.blocked = true;
            user.lockedUntil = new Date(Date.now() + (30 * 60 * 1000)) // 30M
        }

        await user.save();
    }

    resetFailedLoginAttempts = async (user) => {
        user.blocked = false;
        user.lockedUntil = null;
        user.failedLoginAttempts = 0;
        await user.save();
    }

    signup = async (req, res) => {
        const {name, email, password, role, phone, profileImage} = req.body;

        const hashed = await passwordService.hash(password);

        let user = await User.create({name, email, password: hashed, role, phone, profileImage});
        user = user.toObject();
        delete user.password;

        res.status(201).json({
            message: "Created User Successfully",
            user
        })
    }

    login = async(req, res) => {
        const {email, password} = req.body;

        let user = await User.findOne({email});
        if(!user) {
            return res.status(400).json("Invalid Data");
        }

        if(user.blocked) {
            if(user.lockedUntil <= Date.now()) {
                await this.resetFailedLoginAttempts(user);
            } else {
                return res.status(400).json("You can not login now")
            }
        } 

        const isVerified = await passwordService.compare(password, user.password);
        if(!isVerified) {
            await this.handleFailedLoginAttempts(user);
            return res.status(400).json("Invalid Data");
        }

        await this.resetFailedLoginAttempts(user);

        const token = jwtService.generateAccessToken({ 
            id: user._id, 
            email: user.email, 
            role: user.role
        });

        const refreshToken = jwtService.generateRefreshToken({ 
            id: user._id, 
            email: user.email, 
            role: user.role
        });

        user = user.toObject();
        delete user.password;

        cookiesService.setAccessToken(res, token);
        cookiesService.setRefreshToken(res, refreshToken);

        return res.status(201).json({
            message: "Logged In Successfully",
            user: {
                name: user.name,
                role: user.role
            }
        })
    }

    logout = async(req, res) => {
        cookiesService.clearTokens(res);
        res.status(201).json({
            message: "Logged Out Successfully"
        })
    }

    profile = async(req, res) => {
        const userId = req._user.id;

        const user = await User.findById(userId).select("-password");
        if(!user) {
            return res.status(404).json({
                message: "Not Found"
            })
        }

        return res.status(200).json({
            message: "Get Data",
            user
        })
    }

    update = async(req, res) => {
        const targetUserId = req.params.id; // المعرف المرسل في الرابط
        const loggedInUserId = req._user.id; // المعرف القادم من التوكين

        // التحقق: هل المستخدم يحاول تعديل حسابه الشخصي فقط؟
        if (targetUserId !== loggedInUserId) {
            return res.status(403).json({ message: "You Can not Edit Details another User" });
        }

        const updates = {
            name: req.body.name,
            phone: req.body.phone,
            profileImage: req.body.profileImage
        };

        const updatedUser = await User.findByIdAndUpdate(loggedInUserId, updates, { new: true, runValidators: true}).select("-password");

        return res.status(200).json({
            message: "Updated Successfully",
            user: updatedUser
        });
    }

    remove = async(req, res) => {
        const targetUserId = req.params.id; 
        const loggedInUserId = req._user.id;
        const loggedInUserRole = req._user.role;

        // 1. حالة المستخدم العادي (يحذف نفسه فقط)
        if (loggedInUserRole !== "admin") {
            if (targetUserId !== loggedInUserId) {
                return res.status(403).json({ message: "Can not Delete another Users" });
            }
        }

        // 2. حالة الـ Admin (لا يحذف نفسه)
        if (loggedInUserRole === "admin" && targetUserId === loggedInUserId) {
            return res.status(400).json({ message: "Can not Delete Admin User From Here" });
        }

        // تنفيذ الحذف
        // تحديث المستخدم ليكون "محذوفاً"
        const user = await User.findByIdAndUpdate(
            targetUserId, 
            { isDeleted: true }, 
            { new: true }
        );

        await Property.updateMany({ hostId: targetUserId }, { isDeleted: true });
        await Booking.updateMany({ $or: [{ guestId: targetUserId }, { hostId: targetUserId }] }, { isDeleted: true });
        
        return res.status(200).json({ message: "Disabled Account Successfully" });
    }
}

module.exports = new AuthController();