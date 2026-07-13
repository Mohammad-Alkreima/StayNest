const Booking = require("../models/Booking");
const Property = require("../models/Property");
const User = require("../models/User");
const cookiesService = require("../utils/cookiesService");
const sendEmail = require("../utils/emailService");
const jwtService = require("../utils/jwtService");
const passwordService = require("../utils/passwordService");
const crypto = require("crypto");

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
        const targetUserId = req.params.id; // The sender ID in the link
        const loggedInUserId = req._user.id; // The identifier from the token

        // verification: Is the user attempting to modify only their personal account?
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

        // user can delete only him
        if (loggedInUserRole !== "admin") {
            if (targetUserId !== loggedInUserId) {
                return res.status(403).json({ message: "Can not Delete another Users" });
            }
        }

        // admin can not deleted himself
        if (loggedInUserRole === "admin" && targetUserId === loggedInUserId) {
            return res.status(400).json({ message: "Can not Delete Admin User From Here" });
        }

        // update user to be deleted
        const user = await User.findByIdAndUpdate(
            targetUserId, 
            { isDeleted: true }, 
            { new: true }
        );

        await Property.updateMany({ hostId: targetUserId }, { isDeleted: true });
        await Booking.updateMany({ guestId: targetUserId }, { isDeleted: true });
        
        return res.status(200).json({ message: "Disabled Account Successfully" });
    }

    forgotPassword = async (req, res) => {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "No user found with this email" });
        }

        // create random token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // encryption token using sha256 before save in database
        user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // صلاحية 10 دقائق
        
        await user.save();

        // send email
        await sendEmail(user.email, resetToken);

        res.status(200).json({ 
            token: resetToken,
            message: "Token sent to email" });
    };

    resetPassword = async (req, res) => {
        const { token, newPassword } = req.body;

        // encrypting the token received from the user in the same way for comparison. 
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // search for the user who holds this encrypted token with a valid expiration date.
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Token is invalid or has expired" });
        }

        // update password, encrytion it
        user.password = await passwordService.hash(newPassword);
        
        // 4. delete token form database after using
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    };
}

module.exports = new AuthController();