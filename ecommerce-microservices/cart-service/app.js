const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cartRoutes = require("./src/routes/cartRoutes");
const detailCartRoutes=require("./src/routes/detailCartRoutes");
const cors=require('cors');
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/cart", cartRoutes);
app.use("/api/detailcart",detailCartRoutes);

const PORT = process.env.PORT || 3003;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Cart service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ DB connection error:", err);
  });
