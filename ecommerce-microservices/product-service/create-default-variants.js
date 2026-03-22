/**
 * Script to create default variants for products that don't have any
 * Run this script once to fix existing products in the database
 * 
 * Usage: 
 *   MONGO_PASSWORD=your_password node create-default-variants.js
 * 
 * Or edit the connection string below directly (not recommended for security)
 */

const mongoose = require('mongoose');

// Get credentials from environment variable (more secure)
const DB_PASSWORD = process.env.MONGO_PASSWORD || 'dangkhoi557';
const DB_USERNAME = process.env.MONGO_USERNAME || 'dangkhoi556';

// Encode password to handle special characters
const encodedPassword = encodeURIComponent(DB_PASSWORD);
const encodedUsername = encodeURIComponent(DB_USERNAME);

// MongoDB Atlas connection string
const MONGO_URI = `mongodb+srv://${encodedUsername}:${encodedPassword}@cluster0.bbv0num.mongodb.net/product-db?retryWrites=true&w=majority&appName=Cluster0`;

console.log('🔗 Connecting to MongoDB Atlas...');
console.log('📝 Username:', DB_USERNAME);
console.log('');

mongoose.connect(MONGO_URI);

// Define schemas (matching your models)
const ProductSchema = new mongoose.Schema({
  tenSP: String,
  moTa: String,
  giaGoc: Number,
  giaGiam: Number,
  soLuong: Number,
  hinhAnh: String,
  maKM: mongoose.Schema.Types.ObjectId,
  maDM: mongoose.Schema.Types.ObjectId,
  maUserBan: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const VersionProductSchema = new mongoose.Schema({
  mausac: { type: String, default: null },
  kichco: { type: String, default: null },
  soluong: { type: Number, required: true, min: 0 },
  maSP: { type: mongoose.Schema.Types.ObjectId, ref: 'SanPham', required: true }
}, { timestamps: true });

const SanPham = mongoose.model('SanPham', ProductSchema, 'sanphams');
const PhienBan = mongoose.model('phienbanSanpham', VersionProductSchema, 'phienbansanphams');

async function createDefaultVariants() {
  try {
    console.log('🔍 Checking for products without variants...\n');

    // Get all products
    const allProducts = await SanPham.find({});
    console.log(`📦 Found ${allProducts.length} total products`);

    let created = 0;
    let skipped = 0;

    for (const product of allProducts) {
      // Check if product already has variants
      const existingVariants = await PhienBan.find({ maSP: product._id });
      
      if (existingVariants.length === 0) {
        // Create default variant
        await PhienBan.create({
          mausac: null,
          kichco: null,
          soluong: product.soLuong || 0,
          maSP: product._id
        });
        
        console.log(`✅ Created default variant for: ${product.tenSP} (ID: ${product._id})`);
        created++;
      } else {
        console.log(`⏭️  Skipped (has ${existingVariants.length} variant(s)): ${product.tenSP}`);
        skipped++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created} default variants`);
    console.log(`   ⏭️  Skipped: ${skipped} products (already have variants)`);
    console.log(`   📦 Total:   ${allProducts.length} products\n`);
    
    console.log('✨ Done! All products now have at least one variant.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
createDefaultVariants();

