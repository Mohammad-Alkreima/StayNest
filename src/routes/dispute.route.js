const express = require("express");
const router = express.Router();

const disputeController = require("../controllers/dispute.controller");
const auth = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const asyncHandler = require("../utils/asyncHandler");
const idMiddleware = require("../middlewares/id");
const page = require("../middlewares/page");

const {
  createDisputeValidation,
  updateDisputeValidation,
  resolveDisputeValidation,
  filterDisputesValidation,
} = require("../validators/dispute.validation");

router.post(
  "/",
  auth,
  roleMiddleware(["host", "guest"]),
  createDisputeValidation,
  asyncHandler(disputeController.createDispute),
);

router.patch(
  "/updateDispute/:id",
  auth,
  idMiddleware,
  roleMiddleware(["host", "guest"]),
  updateDisputeValidation,
  asyncHandler(disputeController.updateDispute),
);

router.get(
  "/filter",
  auth,
  roleMiddleware(["admin"]),
  page,
  filterDisputesValidation,
  asyncHandler(disputeController.filterDisputes),
);

router.get(
  "/:id",
  auth,
  idMiddleware,
  roleMiddleware(["admin"]),
  asyncHandler(disputeController.getDisputeById),
);

router.get(
  "/",
  auth,
  roleMiddleware(["admin"]),
  page,
  asyncHandler(disputeController.getAllDisputes),
);

router.patch(
  "/:id/resolve",
  auth,
  idMiddleware,
  roleMiddleware(["admin"]),
  resolveDisputeValidation,
  asyncHandler(disputeController.resolveDispute),
);

module.exports = router;

/*
const express = require("express");
const router = express.Router();
const disputeController = require("../controllers/dispute.controller");
const auth = require("../middlewares/auth");
const roleMiddleware = require("../middlewares/role");
const asyncHandler = require("../utils/asyncHandler");
const idMiddleware = require("../middlewares/id");
const page = require("../middlewares/page");
const {
  createDisputeValidation,
  updateDisputeValidation,
  resolveDisputeValidation,
  filterDisputesValidation
} = require("../validators/dispute.validation");

router.post(
  "/",
  auth,
  roleMiddleware("host", "guest"),
  createDisputeValidation,
  asyncHandler(disputeController.createDispute),
);

router.patch(
  "/updateDispute/:id",
  auth,
  roleMiddleware("host", "guest"),
  updateDisputeValidation,
  asyncHandler(disputeController.updateDispute),
);

router.get(
  "/filter",
  auth,
  roleMiddleware("admin"),
  filterDisputesValidation,
  asyncHandler(disputeController.filterDisputes)
);

router.get(
  "/:id"
  ,auth,
  idMiddleware,
  roleMiddleware("admin"),
  asyncHandler(disputeController.getDisputeById),
);

router.get(
  "/",
  auth,
  roleMiddleware("admin"),
  page,
  asyncHandler(disputeController.getAllDisputes)
);

router.patch(
  "/:id/resolve",
  auth,
  roleMiddleware("admin"),
  resolveDisputeValidation,
  asyncHandler(disputeController.resolveDispute),
);

module.exports = router;
*/