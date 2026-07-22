const validate = require("../middlewares/validate");
const { body } = require("express-validator");
const User = require("../models/User");

const signupVaildation = [
    body("name")
        .trim()
        .notEmpty().withMessage("name is required")
        .isString().withMessage("name must be string")
        .escape(),
    
    body("email")
        .trim()
        .notEmpty().withMessage("email is required")
        .isEmail().withMessage("invalid email")
        .isString().withMessage("email must be string")
        .normalizeEmail()
        .custom(async(email) => {
            const user = await User.findOne({email});
            if(user) {
                throw new Error("This Email Already Exist");
            }
            return true;
        })
        .escape(),
    
    body("password")
        .notEmpty().withMessage("Password is required")
        .trim()
        .isString().withMessage("Password Must Be String")
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        }).withMessage("Password Is Weak")
        .escape(),

    body("role")
        .optional({
            checkFalsy: false
        })
        .custom((role) => {
            const roles = ["guest", "host"];
            if(!roles.includes(role)) {
                throw new Error("Invalid Role");
            };
            return true;
        }),
    
    body("phone")
        .optional({
            checkFalsy: true
        })
        .isString().withMessage("Number Phone Must Br String")
        .isMobilePhone().withMessage("Invalid Number Phone"),

    body("profileImage")
        .optional({
            checkFalsy: true
        })
        .isURL().withMessage("put an image url")
        .trim(),

    validate
];

const loginVaildation = [
    body("email")
        .trim()
        .notEmpty().withMessage("email is required")
        .isString().withMessage("Email Must Be String")
        .isEmail().withMessage("Invalid Email")
        .normalizeEmail()
        .escape(),

    body("password")
        .trim()
        .notEmpty().withMessage("password cannot be empty")
        .isString().withMessage("Password must be string")
        .escape(),

    validate
];

const editVaildation = [
    body("name")
        .isString().withMessage("Name Must Be String")
        .trim()
        .optional({
            checkFalsy: true,
            nullable: true
        }),
        
    body("phone")
        .optional({
            checkFalsy: true
        })
        .isString().withMessage("Number Phone Must Br String")
        .isMobilePhone().withMessage("Invalid Number Phone"),

    body("profileImage")
        .optional({
            checkFalsy: true
        })
        .trim()
        .isURL().withMessage("put an image url"),

    validate
]

module.exports = {
    signupVaildation,
    loginVaildation,
    editVaildation
}