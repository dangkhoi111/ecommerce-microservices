const Conversation = require('../models/conversation.model');
const axios = require('axios');
const mongoose = require('mongoose');

exports.startConversation = async (req, res) => {
  const { maKH, maUserBan, role } = req.body; // Thêm role để biết ai đang mở chat
  try {
    console.log(`[startConversation] Request: maKH=${maKH}, maUserBan=${maUserBan}, role=${role}`);
    
    if (!maKH || !maUserBan) {
      return res.status(400).json({ error: 'Missing maKH or maUserBan' });
    }
    
    // Chuyển sang ObjectId nếu cần (nếu trong DB là ObjectId)
    let maKHObj, maUserBanObj;
    try {
      if (mongoose.Types.ObjectId.isValid(maKH)) {
        maKHObj = new mongoose.Types.ObjectId(maKH);
      } else {
        maKHObj = maKH;
      }
      if (mongoose.Types.ObjectId.isValid(maUserBan)) {
        maUserBanObj = new mongoose.Types.ObjectId(maUserBan);
      } else {
        maUserBanObj = maUserBan;
      }
    } catch (err) {
      console.error(`[startConversation] Error converting to ObjectId:`, err);
      return res.status(400).json({ error: 'Invalid maKH or maUserBan format: ' + err.message });
    }
    
    // Query với cả string và ObjectId để đảm bảo tìm thấy
    let existing = await Conversation.findOne({
      $or: [
        { maKH: maKHObj, maUserBan: maUserBanObj },
        { maKH: maKH, maUserBan: maUserBan }
      ]
    });
    console.log(`[startConversation] Found existing conversation:`, existing ? 'Yes' : 'No');
    
    // Nếu conversation đã tồn tại nhưng bị soft delete, restore nó
    if (existing) {
      const now = new Date(Date.now() - 1000); // Trừ 1 giây để đảm bảo
      const updateData = {};
      
      // Nếu customer đã xóa, restore và set restoredAtCustomer
      if (existing.deletedByCustomer) {
        updateData.deletedByCustomer = false;
        updateData.restoredAtCustomer = now;
        console.log(`[startConversation] Restoring conversation for customer when opening chat, restoredAt: ${now}`);
      }
      // Nếu customer mở chat và đã từng restore (có restoredAtCustomer hoặc đã từng xóa)
      // Luôn update restoredAtCustomer để chỉ hiển thị tin nhắn từ lúc mở chat này
      else if (role === 'customer') {
        // Nếu đã có restoredAtCustomer (đã từng xóa và restore), update lại
        // Hoặc nếu đã từng xóa (có deletedAtCustomer), set restoredAtCustomer mới
        if (existing.restoredAtCustomer || existing.deletedAtCustomer) {
          updateData.restoredAtCustomer = now;
          console.log(`[startConversation] Updating restoredAtCustomer for customer when reopening chat, restoredAt: ${now}`);
        }
      }
      
      // Nếu seller đã xóa, restore và set restoredAtSeller
      if (existing.deletedBySeller) {
        updateData.deletedBySeller = false;
        updateData.restoredAtSeller = now;
        console.log(`[startConversation] Restoring conversation for seller when opening chat, restoredAt: ${now}`);
      }
      // Nếu seller mở chat và đã từng restore (có restoredAtSeller hoặc đã từng xóa)
      else if (role === 'seller') {
        // Nếu đã có restoredAtSeller (đã từng xóa và restore), update lại
        // Hoặc nếu đã từng xóa (có deletedAtSeller), set restoredAtSeller mới
        if (existing.restoredAtSeller || existing.deletedAtSeller) {
          updateData.restoredAtSeller = now;
          console.log(`[startConversation] Updating restoredAtSeller for seller when reopening chat, restoredAt: ${now}`);
        }
      }
      
      // Nếu có thay đổi, update conversation
      if (Object.keys(updateData).length > 0) {
        existing = await Conversation.findByIdAndUpdate(
          existing._id,
          { $set: updateData },
          { new: true }
        );
        console.log(`[startConversation] Updated conversation:`, {
          restoredAtCustomer: existing.restoredAtCustomer,
          restoredAtSeller: existing.restoredAtSeller,
          deletedByCustomer: existing.deletedByCustomer,
          deletedBySeller: existing.deletedBySeller
        });
      }
      
      return res.status(200).json(existing);
    }

    const newConv = await Conversation.create({ maKH: maKHObj, maUserBan: maUserBanObj });
    console.log(`[startConversation] Created new conversation:`, newConv._id);
    res.status(201).json(newConv);
  } catch (err) {
    console.error(`[startConversation] Error:`, err);
    res.status(500).json({ error: err.message });
  }
};

exports.getUserConversations = async (req, res) => {
  const { maKH } = req.query;

  try {
    console.log('Getting conversations for maKH:', maKH);
    
    // Mongoose sẽ tự động convert string sang ObjectId nếu cần
    let allConversations = [];
    
    // Thử query với string trước
    allConversations = await Conversation.find({ maKH: maKH }).sort({ updatedAt: -1 });
    console.log('Query with string - Total conversations found:', allConversations.length);
    
    // Nếu không tìm thấy và là ObjectId hợp lệ, thử với ObjectId
    if (allConversations.length === 0 && mongoose.Types.ObjectId.isValid(maKH)) {
      const maKHObj = new mongoose.Types.ObjectId(maKH);
      allConversations = await Conversation.find({ maKH: maKHObj }).sort({ updatedAt: -1 });
      console.log('Query with ObjectId - Total conversations found:', allConversations.length);
    }
    
    // Chỉ lấy conversations chưa bị xóa bởi customer
    // Filter trong memory để đảm bảo hoạt động đúng
    const conversations = allConversations.filter(conv => {
      return !conv.deletedByCustomer || conv.deletedByCustomer === false;
    });
    
    console.log('Conversations after filter:', conversations.length);

    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        try {
          const response = await axios.get(`http://localhost:3002/api/user-ban/check/${conv.maUserBan}`);
          const userBan = response.data;

          return {
            _id: conv._id,
            maKH: conv.maKH,
            maUserBan: conv.maUserBan,
            tinNhanCuoi: conv.tinNhanCuoi,
            thoiGianNhanCuoi: conv.thoiGianNhanCuoi,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            tenShop: userBan.tenShop || 'Không rõ',
            hinhAnh: userBan.hinhAnh || '',
            tinhThanh: userBan.tinhThanh || '',
            diaChiChiTiet: userBan.diaChiChiTiet || ''
          };
        } catch (err) {
          console.error(`Không lấy được thông tin người bán ${conv.maUserBan}:`, err.message);
          return {
            ...conv.toObject(), // fallback khi không gọi được API
            tenShop: 'Không rõ',
            hinhAnh: '',
            tinhThanh: '',
            diaChiChiTiet: ''
          };
        }
      })
    );

    res.json(enrichedConversations);
  } catch (err) {
    console.error('Lỗi khi lấy danh sách cuộc trò chuyện:', err);
    res.status(500).json({ error: err.message });
  }
};

// controllers/conversation.controller.js

exports.getConversationsByUserBan = async (req, res) => {
  const { maUserBan } = req.query;

  if (!maUserBan) return res.status(400).json({ error: 'Thiếu maUserBan' });

  try {
    console.log('Getting conversations for maUserBan:', maUserBan);
    
    // Mongoose sẽ tự động convert string sang ObjectId nếu cần
    // Query với cả string và ObjectId để đảm bảo tìm thấy
    let allConversations = [];
    
    // Thử query với string trước
    allConversations = await Conversation.find({ maUserBan: maUserBan }).sort({ updatedAt: -1 });
    console.log('Query with string - Total conversations found:', allConversations.length);
    
    // Nếu không tìm thấy và là ObjectId hợp lệ, thử với ObjectId
    if (allConversations.length === 0 && mongoose.Types.ObjectId.isValid(maUserBan)) {
      const maUserBanObj = new mongoose.Types.ObjectId(maUserBan);
      allConversations = await Conversation.find({ maUserBan: maUserBanObj }).sort({ updatedAt: -1 });
      console.log('Query with ObjectId - Total conversations found:', allConversations.length);
    }
    
    // Chỉ lấy conversations chưa bị xóa bởi seller
    // Filter trong memory để đảm bảo hoạt động đúng
    const conversations = allConversations.filter(conv => {
      return !conv.deletedBySeller || conv.deletedBySeller === false;
    });
    
    console.log('Conversations after filter:', conversations.length);

    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        try {
          console.log('Enriching conversation for maKH:', conv.maKH);
          const response = await axios.get(`http://localhost:3002/api/auth/${conv.maKH}`);
          const khachHang = response.data;
       
          return {
            ...conv.toObject(),
            tenKhachHang: khachHang.data?.hoTen || khachHang.hoTen || 'Không rõ',
            hinhKH: khachHang.data?.avatar || khachHang.data?.hinhAnh || khachHang.avatar || khachHang.hinhAnh || ''
          };
        } catch (err) {
          console.error(`Error enriching conversation for maKH ${conv.maKH}:`, err.message);
          return {
            ...conv.toObject(),
            tenKhachHang: 'Không rõ',
            hinhKH: ''
          };
        }
      })
    );

    console.log('Enriched conversations:', enriched.length);
    res.json(enriched);
  } catch (err) {
    console.error('Error in getConversationsByUserBan:', err);
    res.status(500).json({ error: err.message });
  }
};


exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // role: 'customer' hoặc 'seller'
    
    const updateData = {};
    const now = new Date();
    
    if (role === 'customer') {
      updateData.deletedByCustomer = true;
      updateData.deletedAtCustomer = now;
      // Reset restored time khi xóa lại
      updateData.restoredAtCustomer = null;
    } else if (role === 'seller') {
      updateData.deletedBySeller = true;
      updateData.deletedAtSeller = now;
      // Reset restored time khi xóa lại
      updateData.restoredAtSeller = null;
    } else {
      return res.status(400).json({ error: 'Thiếu role hoặc role không hợp lệ' });
    }
    
    await Conversation.findByIdAndUpdate(id, updateData);
    res.status(200).json({ message: 'Đã xoá hội thoại' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateLastMessage = async (req, res) => {
  const { maKH, maUserBan, noiDung, nguoiGui } = req.body;
  try {
    const updateData = {
      tinNhanCuoi: noiDung,
      thoiGianNhanCuoi: new Date()
    };
    
    // Nếu có thông tin người gửi, restore conversation cho người nhận
    if (nguoiGui === 'customer') {
      updateData.deletedBySeller = false;
    } else if (nguoiGui === 'seller') {
      updateData.deletedByCustomer = false;
    } else {
      // Nếu không có thông tin người gửi, restore cho cả hai bên
      updateData.deletedByCustomer = false;
      updateData.deletedBySeller = false;
    }
    
    const updated = await Conversation.findOneAndUpdate(
      { maKH, maUserBan },
      { $set: updateData },
      { upsert: true, new: true }
    );
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};