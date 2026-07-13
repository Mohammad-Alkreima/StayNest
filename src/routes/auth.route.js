const express = require("express");
const router = express.Router();

const asyncHandler = require("../utils/asyncHandler");
const authController = require("../controllers/auth.controller");
const auth = require("../middlewares/auth");
const role = require("../middlewares/role");
const id = require("../middlewares/id");
const { loginLimiter } = require("../middlewares/limiter");
const { signupVaildation, loginVaildation, editVaildation } = require("../validators/auth.validate");


router.post("/signup", [...signupVaildation], asyncHandler(authController.signup));

router.post("/login", [loginLimiter, ...loginVaildation], asyncHandler(authController.login));

router.post("/logout", [auth], asyncHandler(authController.logout));
router.post("/forgotpassword", [auth], asyncHandler(authController.forgotPassword));
router.post("/resetpassword", [auth], asyncHandler(authController.resetPassword));

router.put("/edit/:id", [auth, id, ...editVaildation], asyncHandler(authController.update));

router.delete("/delete/:id", [auth, id], asyncHandler(authController.remove));

router.get("/profile", [auth], asyncHandler(authController.profile));

module.exports = router;