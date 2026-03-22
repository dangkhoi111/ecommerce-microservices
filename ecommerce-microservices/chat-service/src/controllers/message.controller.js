const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');
exports.sendMessage = async (req, res) => {
  try {
    const { maKH, maUserBan, noiDung , nguoiGui} = req.body;
      console.log('Received body:', req.body);
 if (!['customer', 'seller'].includes(nguoiGui)) {
      return res.status(400).json({ error: 'Giá trị nguoiGui phải là "customer" hoặc "seller"' });
    }

    // 1. Kiểm tra và restore conversation TRƯỚC khi gửi tin nhắn
    // Nếu người nhận đã xóa conversation, restore lại cho họ
    const existingConv = await Conversation.findOne({ maKH, maUserBan });
    
    // Set restore time trước một chút để đảm bảo tin nhắn restore được bao gồm
    const restoreTime = new Date(Date.now() - 1000); // Trừ 1 giây để đảm bảo
    
    // Nếu customer gửi tin nhắn, restore conversation cho seller nếu seller đã xóa
    if (nguoiGui === 'customer') {
      if (existingConv && existingConv.deletedBySeller) {
        await Conversation.findOneAndUpdate(
          { maKH, maUserBan },
          {
            $set: {
              deletedBySeller: false,
              restoredAtSeller: restoreTime
            }
          }
        );
        console.log(`Restoring conversation for seller, restoredAt: ${restoreTime}`);
      }
    }
    // Nếu seller gửi tin nhắn, restore conversation cho customer nếu customer đã xóa
    else if (nguoiGui === 'seller') {
      if (existingConv && existingConv.deletedByCustomer) {
        await Conversation.findOneAndUpdate(
          { maKH, maUserBan },
          {
            $set: {
              deletedByCustomer: false,
              restoredAtCustomer: restoreTime
            }
          }
        );
        console.log(`Restoring conversation for customer, restoredAt: ${restoreTime}`);
      }
    }
    
    // 2. Gửi tin nhắn (sau khi restore)
    const newMsg = await Message.create({ maKH, maUserBan, noiDung , nguoiGui });

    // 3. Cập nhật last message của conversation
    const now = new Date();
    await Conversation.findOneAndUpdate(
      { maKH, maUserBan },
      {
        $set: {
          tinNhanCuoi: noiDung,
          thoiGianNhanCuoi: now
        }
      },
      { upsert: true, new: true }
    );
    
    console.log(`Message sent by ${nguoiGui}, conversation restored for receiver if needed`);

    res.status(201).json(newMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMessages = async (req, res) => {
  const { maKH, maUserBan, role } = req.query;
  try {
    const mongoose = require('mongoose');
    const filter = {};
    
    // Convert maKH và maUserBan sang ObjectId nếu cần
    let maKHObj = maKH;
    let maUserBanObj = maUserBan;
    if (maKH && mongoose.Types.ObjectId.isValid(maKH)) {
      maKHObj = new mongoose.Types.ObjectId(maKH);
    }
    if (maUserBan && mongoose.Types.ObjectId.isValid(maUserBan)) {
      maUserBanObj = new mongoose.Types.ObjectId(maUserBan);
    }
    
    if (maKH) filter.maKH = maKHObj;
    if (maUserBan) filter.maUserBan = maUserBanObj;

    // Lấy conversation để biết thời điểm restore - query với cả string và ObjectId
    let conversation = await Conversation.findOne({
      $or: [
        { maKH: maKHObj, maUserBan: maUserBanObj },
        { maKH: maKH, maUserBan: maUserBan }
      ]
    });
    
    console.log(`[getMessages] Getting messages - role: ${role}, maKH: ${maKH}, maUserBan: ${maUserBan}`);
    console.log(`[getMessages] Conversation:`, {
      found: conversation ? 'Yes' : 'No',
      restoredAtCustomer: conversation?.restoredAtCustomer,
      restoredAtSeller: conversation?.restoredAtSeller,
      deletedByCustomer: conversation?.deletedByCustomer,
      deletedBySeller: conversation?.deletedBySeller,
      deletedAtCustomer: conversation?.deletedAtCustomer,
      deletedAtSeller: conversation?.deletedAtSeller
    });
    
    // Nếu conversation đã được restore, chỉ lấy tin nhắn sau thời điểm restore
    // Sử dụng $gte để bao gồm cả tin nhắn được tạo cùng lúc hoặc sau khi restore
    if (conversation) {
      if (role === 'customer') {
        // Nếu có restoredAtCustomer, dùng nó để filter (đã restore)
        if (conversation.restoredAtCustomer) {
          filter.createdAt = { $gte: conversation.restoredAtCustomer };
          console.log(`[getMessages] Filtering messages after restore time for customer: ${conversation.restoredAtCustomer}`);
        }
        // Nếu có deletedAtCustomer nhưng không có restoredAtCustomer, có nghĩa là đã xóa nhưng chưa restore
        // Trong trường hợp này, vẫn filter để không hiển thị tin nhắn cũ
        // Sử dụng deletedAtCustomer làm mốc thời gian để filter (chỉ hiển thị tin nhắn sau khi xóa)
        else if (conversation.deletedAtCustomer && !conversation.restoredAtCustomer) {
          // Nếu đã xóa nhưng chưa restore, vẫn filter để không hiển thị tin nhắn cũ
          // Chỉ hiển thị tin nhắn sau thời điểm xóa (nếu có tin nhắn mới từ bên kia)
          filter.createdAt = { $gte: conversation.deletedAtCustomer };
          console.log(`[getMessages] Customer deleted conversation but not restored yet, filtering messages after delete time: ${conversation.deletedAtCustomer}`);
        }
        // Nếu không có cả hai, hiển thị tất cả tin nhắn (chưa từng xóa)
        else {
          console.log(`[getMessages] No delete/restore time found for customer, showing all messages`);
        }
      } else if (role === 'seller') {
        // Tương tự cho seller
        if (conversation.restoredAtSeller) {
          filter.createdAt = { $gte: conversation.restoredAtSeller };
          console.log(`[getMessages] Filtering messages after restore time for seller: ${conversation.restoredAtSeller}`);
        }
        else if (conversation.deletedAtSeller && !conversation.restoredAtSeller) {
          // Nếu đã xóa nhưng chưa restore, vẫn filter để không hiển thị tin nhắn cũ
          filter.createdAt = { $gte: conversation.deletedAtSeller };
          console.log(`[getMessages] Seller deleted conversation but not restored yet, filtering messages after delete time: ${conversation.deletedAtSeller}`);
        }
        else {
          console.log(`[getMessages] No delete/restore time found for seller, showing all messages`);
        }
      }
    } else {
      console.log(`[getMessages] No conversation found, showing all messages`);
    }
    
    console.log(`[getMessages] Filter:`, JSON.stringify(filter, null, 2));

    const messages = await Message.find(filter).sort({ createdAt: 1 });
    console.log(`Found ${messages.length} messages after filtering`);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
