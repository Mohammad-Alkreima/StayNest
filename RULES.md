- Route: [nameRoute].routes.js
- Controller: [nameController].controller.js
- Model: User.js

- route: {
    const express = require("express");
    const router = express.Router();

    const asyncHandler = require("../utils/asyncHandler");
    const authController = require("../controllers/auth.controller");;

    router.get("/path", [...middlewares], asyncHandler(authController.profile))

    module.exports = router
}

- controller: {
    class AuthController {
        profile = async (req, res) => {}
        ...
    }

    module.exports = new AuthController();
}

- models: {
    const mongoose = require("mongoose");

    const nameSchema = new mongoose.Schema({
        ....
    }, {
        timestamps: true
    })

    module.exports = mongoose.model("Name", nameSchema);
}

- valiators: {
    const { body } = require("express-validator");
    const validate = require("../middlewares/validate");

    const nameValiation = [
        body("....") 
            .
            .

        validate
    ]

    module.exports = { nameValiation };

}