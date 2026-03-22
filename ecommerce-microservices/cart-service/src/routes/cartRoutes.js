const express = require("express");
const router = express.Router();
const cartController = require("./../controllers/cartController");

router.post("/", cartController.createCart);
router.get("/:id", cartController.getCartByCustomer);

module.exports = router;
