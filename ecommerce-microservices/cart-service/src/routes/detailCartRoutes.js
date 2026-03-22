const express = require("express");
const router = express.Router();
const detailCartController = require("./../controllers/detailCartController");

router.post("/", detailCartController.addItemToCart);
router.get("/:id", detailCartController.getCartItems);
router.delete('/remove/:id', detailCartController.removeItemFromCart);
router.put('/update/:id', detailCartController.updateItemQuantity);
module.exports = router;
