const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const Invoice = require('../models/invoice');
const Order = require('../models/order');
const OrderItem = require('../models/orderItem');

// ... existing code ...

const normalizeVariantValue = (value) => {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned === '-' || cleaned === '—' || cleaned === '–' || cleaned === '/') {
    return null;
  }
  return cleaned;
};

const parseInvoiceText = (rawText = '') => {
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  const text = rawText.replace(/\s+/g, ' ').trim();

  let customerName = null;
  let phoneNumber = null;
  let address = null;
  let province = null;
  let orderCode = null;
  let date = null;
  let status = null;
  let paymentMethod = null;
  let totalValue = null;
  let products = [];

  // Tìm thông tin theo format hóa đơn mới
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length === 0) continue;
    const lowerLine = line.toLowerCase();

    // Trích xuất Họ tên (Họ tên: ...)
    if ((lowerLine.includes('họ tên') || lowerLine.includes('ho ten') || lowerLine.includes('khách hàng') || lowerLine.includes('customer')) && !customerName) {
      const match = line.match(/(?:họ\s*tên|ho\s*ten|khách\s*hàng|customer)\s*[:\-]?\s*(.+)/i);
      if (match && match[1]) {
        customerName = match[1].trim();
        customerName = customerName.replace(/\s*(?:sđt|sdt|địa\s*chỉ|address|tổng\s*tiền|tong\s*tien|total).*$/i, '').trim();
      }
    }

    // Trích xuất SĐT (SĐT: ...)
    if ((lowerLine.includes('sđt') || lowerLine.includes('sdt') || lowerLine.includes('phone') || lowerLine.includes('số điện thoại')) && !phoneNumber) {
      const match = line.match(/(?:sđt|sdt|phone|số\s*điện\s*thoại)\s*[:\-]?\s*([0-9\s\-]+)/i);
      if (match && match[1]) {
        phoneNumber = match[1].replace(/[^\d]/g, '').trim();
      }
    }

    // Trích xuất Địa chỉ chi tiết (Địa chỉ: ...)
    // Cần tách riêng khỏi trạng thái nếu bị dính
    if ((lowerLine.includes('địa chỉ') || lowerLine.includes('dia chi') || lowerLine.includes('address')) && !address) {
      let match = line.match(/(?:địa\s*chỉ|dia\s*chi|address)\s*[:\-]?\s*(.+)/i);
      if (!match) {
        match = line.match(/(?:địachỉ)\s*[:\-]?\s*(.+)/i);
      }
      if (match && match[1]) {
        address = match[1].trim();
        
        // Tách riêng nếu có "Trạng thái" hoặc "Đã hoàn thành" ở đầu
        const statusMatch = address.match(/^(?:đã\s*hoàn\s*thành|đang\s*xử\s*lý|đã\s*hủy|trạng\s*thái)\s*(.+)/i);
        if (statusMatch) {
          address = statusMatch[1].trim();
        }
        
        // Tách riêng nếu có "Phương thức" ở cuối
        const methodMatch = address.match(/(.+?)(?:\s+phương\s*thức|phuong\s*thuc|payment|method)\s*[:\-]?\s*/i);
        if (methodMatch && methodMatch[1]) {
          address = methodMatch[1].trim();
        }
        
        // Tách riêng nếu có "Tỉnh/Thành:" ở cuối (chỉ khi có từ khóa rõ ràng)
        const provinceKeywordMatch = address.match(/(.+?)(?:\s+)(?:tỉnh\/thành|tinh\/thanh)\s*[:\-]?\s*/i);
        if (provinceKeywordMatch && provinceKeywordMatch[1]) {
          address = provinceKeywordMatch[1].trim();
        }
        
        // Loại bỏ số tiền nếu có
        address = address.replace(/\s*[\d.,]+\s*(?:vnđ|vnd|đ|dong).*$/i, '').trim();
        address = address.replace(/[.;]+$/, '').trim();
      }
    }

    // Trích xuất Tỉnh/Thành (Tỉnh/Thành: ...)
    // Cần tách riêng khỏi Phương thức và Địa chỉ nếu bị dính
    if ((lowerLine.includes('tỉnh/thành') || lowerLine.includes('tinh/thanh') || lowerLine.includes('tỉnh') || lowerLine.includes('thành') || lowerLine.includes('tp')) && !province) {
      let match = line.match(/(?:tỉnh\/thành|tinh\/thanh|tỉnh|thành|tp|tp\.|thành\s*phố)\s*[:\-]?\s*([A-ZÀ-ỹ\s]+)/i);
      if (!match) {
        match = line.match(/(?:cod|banking|momo|zalopay)\s+(?:tỉnh\/thành|tinh\/thanh|tỉnh|thành|tp)\s*[:\-]?\s*([A-ZÀ-ỹ\s]+)/i);
      }
      if (match && match[1]) {
        province = match[1].trim();
        
        // Loại bỏ phần "Địa chỉ" nếu có (tránh nhầm với địa chỉ)
        province = province.replace(/^địa\s*chỉ\s*[:\-]?\s*/i, '').trim();
        // Loại bỏ số nếu có ở đầu
        province = province.replace(/^\d+\s*/, '').trim();
        // Loại bỏ các phần không cần thiết
        province = province.replace(/\s*(?:tổng\s*tiền|tong\s*tien|total|thanh\s*to[aá]n|phương\s*thức|cod|banking|stt|tên\s*sản\s*phẩm|địa\s*chỉ|dia\s*chi).*$/i, '').trim();
        
        // Chỉ lấy phần đầu (tên tỉnh/thành, thường là 1-3 từ)
        const provinceWords = province.split(/\s+/).filter(word => {
          return !/^\d+$/.test(word) && word.length > 1;
        });
        province = provinceWords.slice(0, 3).join(' ').trim();
        
        // Validate: tỉnh/thành không được là số hoặc quá ngắn
        if (province.length < 3 || /^\d+$/.test(province)) {
          province = null;
        }
      }
    }

    // Trích xuất Mã đơn (#...)
    if ((lowerLine.includes('mã đơn') || lowerLine.includes('ma don') || lowerLine.includes('order') || lowerLine.includes('invoice')) && !orderCode) {
      const match = line.match(/(?:m[aã]\s*đơn|m[aã]\s*hàng|order|invoice|don\s*hang|h[aá]o\s*đơn)\s*[:\-]?\s*#?\s*([A-Z0-9\-]{6,})/i);
      if (match && match[1]) {
        orderCode = match[1].trim();
      }
    }

    // Trích xuất Ngày (Ngày: dd/mm/yyyy)
    if ((lowerLine.includes('ngày') || lowerLine.includes('date')) && !date) {
      const match = line.match(/(?:ngày|date)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
      if (match && match[1]) {
        date = match[1].trim();
      }
    }

    // Trích xuất Trạng thái (Trạng thái: ...)
    // Cần tách riêng khỏi Địa chỉ nếu bị dính
    if ((lowerLine.includes('trạng thái') || lowerLine.includes('trang thai') || lowerLine.includes('status')) && !status) {
      const match = line.match(/(?:trạng\s*thái|trang\s*thai|status)\s*[:\-]?\s*(.+)/i);
      if (match && match[1]) {
        status = match[1].trim();
        
        // Tách riêng nếu có "Địa chỉ" trong cùng dòng
        const addressMatch = status.match(/^(.+?)\s*(?:địa\s*chỉ|dia\s*chi|address)\s*[:\-]?\s*/i);
        if (addressMatch) {
          status = addressMatch[1].trim();
        }
        
        // Loại bỏ các phần không cần thiết
        status = status.replace(/\s*(?:phương\s*thức|phuong\s*thuc|payment|mã\s*đơn|địa\s*chỉ|dia\s*chi).*$/i, '').trim();
      }
    }
    
    // Fallback: Tìm trạng thái nếu không có label "Trạng thái:"
    if (!status) {
      const statusKeywords = ['đã hoàn thành', 'đang xử lý', 'đã hủy', 'đang giao hàng', 'đã giao hàng'];
      for (const keyword of statusKeywords) {
        if (lowerLine.includes(keyword) && !lowerLine.includes('địa chỉ')) {
          const statusMatch = line.match(new RegExp(`(${keyword})`, 'i'));
          if (statusMatch) {
            status = statusMatch[1].trim();
            const addressIndex = status.toLowerCase().indexOf('địa chỉ');
            if (addressIndex > 0) {
              status = status.substring(0, addressIndex).trim();
            }
            break;
          }
        }
      }
    }

    // Trích xuất Phương thức (Phương thức: ...)
    // Cần tách riêng khỏi Tỉnh/Thành nếu bị dính
    if ((lowerLine.includes('phương thức') || lowerLine.includes('phuong thuc') || lowerLine.includes('payment') || lowerLine.includes('cod')) && !paymentMethod) {
      let match = line.match(/(?:phương\s*thức|phuong\s*thuc|payment|method)\s*[:\-]?\s*(.+)/i);
      if (match && match[1]) {
        paymentMethod = match[1].trim();
        // Tách riêng nếu có "Tinh/Thanh" hoặc "Tỉnh/Thành" trong cùng dòng
        const provinceMatch = paymentMethod.match(/^(.+?)\s*(?:tinh\/thanh|tỉnh\/thành|tinh|thanh|tp)\s*[:\-]?\s*(.+)$/i);
        if (provinceMatch) {
          paymentMethod = provinceMatch[1].trim();
          if (!province && provinceMatch[2]) {
            province = provinceMatch[2].trim();
          }
        }
        // Loại bỏ các phần không cần thiết
        paymentMethod = paymentMethod.replace(/\s*(?:trạng\s*thái|status|mã\s*đơn|tinh\/thanh|tỉnh\/thành).*$/i, '').trim();
        // Chỉ lấy phần đầu (thường là cod, banking, v.v.)
        paymentMethod = paymentMethod.split(/\s+/)[0].trim();
      }
    }

    // Trích xuất Tổng tiền
    if ((lowerLine.includes('tổng tiền') || lowerLine.includes('tong tien') || lowerLine.includes('total') || lowerLine.includes('thanh toán')) && !totalValue) {
      const match = line.match(/(?:tổng\s*tiền|tong\s*tien|total|thanh\s*to[aá]n|thành\s*tiền)\s*[:\-]?\s*([\d.,\s]+)/i);
      if (match && match[1]) {
        const normalized = match[1].replace(/[^\d]/g, '');
        if (normalized && normalized.length >= 4) {
          totalValue = Number(normalized);
        }
      }
    }
  }

  // Trích xuất thông tin sản phẩm từ bảng (nếu có)
  // Tìm dòng có "Tên sản phẩm" hoặc "STT" để xác định bảng sản phẩm
  let productTableStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase();
    if (lowerLine.includes('tên sản phẩm') || lowerLine.includes('ten san pham') || 
        (lowerLine.includes('stt') && lowerLine.includes('số lượng'))) {
      productTableStart = i + 1;
      break;
    }
  }

  // Nếu tìm thấy bảng sản phẩm, trích xuất các sản phẩm
  if (productTableStart > 0) {
    for (let i = productTableStart; i < lines.length && i < productTableStart + 20; i++) {
      const line = lines[i];
      // Bỏ qua dòng header hoặc dòng trống
      if (!line || line.toLowerCase().includes('tên sản phẩm') || 
          (line.toLowerCase().includes('stt') && line.toLowerCase().includes('số lượng')) ||
          line.toLowerCase().includes('tổng tiền') || line.length < 5) {
        continue;
      }
      
      // Parse sản phẩm: STT | Tên | SL | Màu | Kích thước | Giá
      // Strategy: Tìm giá ở cuối, sau đó parse ngược lại
      
      // 1. Tìm giá tiền ở cuối dòng
      const priceMatch = line.match(/([\d.,]{6,})\s*(?:vnđ|vnd|đ|dong)?\s*$/i);
      if (!priceMatch) continue;
      
      const priceStr = priceMatch[1].replace(/[^\d]/g, '');
      if (priceStr.length < 4) continue;
      
      // 2. Tách phần còn lại (trước giá)
      let remainingLine = line.substring(0, priceMatch.index).trim();
      const parts = remainingLine.split(/\s+/);
      if (parts.length < 4) continue;
      
      // 3. STT là phần đầu tiên
      const stt = parseInt(parts[0]);
      if (isNaN(stt) || stt < 1) continue;
      
      // 4. Tìm số lượng: số nhỏ (1-10) đứng một mình, gần cuối (trước màu/kích thước)
      // Strategy: Parse từ cuối lên để tìm số lượng đúng
      let quantityIdx = -1;
      let quantity = 1;
      
      // Tìm số lượng từ cuối lên (bỏ qua 2 phần cuối là màu và kích thước)
      // Số lượng thường là số nhỏ (1-10) đứng một mình, đứng trước màu/kích thước
      for (let j = parts.length - 3; j >= 2; j--) {
        const num = parseInt(parts[j]);
        // Số lượng thường là số nhỏ (1-10), đơn chữ số
        if (!isNaN(num) && num >= 1 && num <= 10 && parts[j].length === 1) {
          // Kiểm tra phần sau có phải là màu/kích thước không (từ đơn chỉ có chữ cái)
          const nextPart = j < parts.length - 1 ? parts[j + 1] : '';
          const isColorSize = nextPart && (
            /^[A-ZÀ-ỹa-z]+$/i.test(nextPart) || // Từ đơn chỉ có chữ cái (như "Bạc")
            nextPart === '-' || 
            nextPart === '—' || 
            nextPart === '–'
          );
          
          if (isColorSize) {
            quantityIdx = j;
            quantity = num;
            break;
          }
        }
      }
      
      if (quantityIdx === -1) continue;
      
      // Validate: phần trước số lượng phải là tên sản phẩm (không phải số lớn)
      // Nếu phần ngay trước số lượng là số lớn (như "17"), thì số lượng này có thể sai
      const prevPart = quantityIdx > 1 ? parts[quantityIdx - 1] : '';
      if (prevPart && /^\d{2,}$/.test(prevPart)) {
        // Phần trước là số lớn (như "17"), có thể là số trong tên sản phẩm
        // Kiểm tra xem có phải là số lượng thật không bằng cách xem phần sau
        const nextPart = quantityIdx < parts.length - 1 ? parts[quantityIdx + 1] : '';
        // Nếu phần sau là màu/kích thước rõ ràng, thì đây là số lượng đúng
        if (!nextPart || (!/^[A-ZÀ-ỹa-z]+$/i.test(nextPart) && nextPart !== '-' && nextPart !== '—' && nextPart !== '–')) {
          // Không phải số lượng, bỏ qua
          continue;
        }
      }
      
      // 5. Tên sản phẩm là từ phần 1 đến trước số lượng (bao gồm cả số trong tên như "Iphone 17")
      let productName = parts.slice(1, quantityIdx).join(' ').trim();
      
      // 6. Màu và kích thước là sau số lượng
      const afterQuantity = parts.slice(quantityIdx + 1);
      let color = '-';
      let size = '-';
      
      if (afterQuantity.length >= 2) {
        // Có cả màu và kích thước: màu là từ đầu tiên, kích thước là phần còn lại
        color = afterQuantity[0].trim();
        size = afterQuantity.slice(1).join(' ').trim();
      } else if (afterQuantity.length === 1) {
        // Chỉ có một giá trị, có thể là màu hoặc kích thước
        const val = afterQuantity[0].trim();
        if (val !== '-' && val !== '—' && val !== '–') {
          color = val;
        }
      }
      
      // Normalize
      const normalizedColor = normalizeVariantValue(color);
      const normalizedSize = normalizeVariantValue(size);
      
      // Validate: tên sản phẩm phải có ít nhất 3 ký tự
      if (productName.length < 3) continue;
      
      products.push({
        name: productName,
        quantity: quantity,
        color: normalizedColor,
        size: normalizedSize,
        price: Number(priceStr)
      });
      continue;
    }
  }

  // Fallback cho các trường chưa tìm thấy
  if (!totalValue) {
    let totalMatch =
      text.match(/(?:tổng\s*tiền|tong\s*tien|total|thanh\s*to[aá]n|thành\s*tiền)\s*[:\-]?\s*([\d.,\s]+)/i) ||
      text.match(/(?:tổng|tong)\s*[:\-]?\s*([\d.,\s]+)\s*(?:vnđ|vnd|đ|dong)/i) ||
      text.match(/([\d.,\s]{6,})\s*(?:vnđ|vnd|đ|dong)/i);

    if (!totalMatch) {
      const numbers = text.match(/[\d.,\s]{6,}/g);
      if (numbers && numbers.length > 0) {
        const maxNumber = numbers.reduce((max, num) => {
          const normalized = num.replace(/[^\d]/g, '');
          const maxNormalized = max.replace(/[^\d]/g, '');
          return Number(normalized) > Number(maxNormalized) ? num : max;
        });
        totalMatch = [null, maxNumber];
      }
    }

    if (totalMatch && totalMatch[1]) {
      const normalized = totalMatch[1].replace(/[^\d]/g, '');
      if (normalized && normalized.length >= 4) {
        totalValue = Number(normalized);
      }
    }
  }

  if (!orderCode) {
    const orderCodeMatch =
      text.match(/(?:m[aã]\s*đơn|m[aã]\s*h[aà]ng|order|invoice|don\s*hang|h[aá]o\s*đơn)\s*(?:#|:|\s+)?\s*([A-Z0-9\-]{6,})/i) ||
      text.match(/#\s*([A-Z0-9]{6,})/i) ||
      text.match(/(?:HD|INV|ORD)\s*[:\-]?\s*([A-Z0-9\-]+)/i);
    if (orderCodeMatch) {
      orderCode = orderCodeMatch[1];
    }
  }

  if (!date) {
    const dateMatch =
      text.match(/(?:ng[aà]y|date)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i) ||
      text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/) ||
      text.match(/(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/);
    if (dateMatch) {
      date = dateMatch[1];
    }
  }

  if (!customerName) {
    const customerMatch = text.match(/(?:họ\s*tên|ho\s*ten|kh[aá]ch\s*h[aà]ng|customer|người\s*mua)\s*[:\-]?\s*([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][^\n]*?)(?=\s*(?:sđt|sdt|địa\s*chỉ|address|$|\n))/i);
    if (customerMatch && customerMatch[1]) {
      customerName = customerMatch[1].trim();
      customerName = customerName.replace(/\s*(?:sđt|sdt|địa\s*chỉ|address|tổng\s*tiền|tong\s*tien|total).*$/i, '').trim();
    }
  }

  if (!phoneNumber) {
    const phoneMatch = text.match(/(?:sđt|sdt|phone|số\s*điện\s*thoại)\s*[:\-]?\s*([0-9\s\-]{8,})/i);
    if (phoneMatch) {
      phoneNumber = phoneMatch[1].replace(/[^\d]/g, '').trim();
    }
  }

  if (!address) {
    // Tìm địa chỉ với pattern linh hoạt hơn, lấy đến khi gặp từ khóa rõ ràng
    // Pattern: lấy tất cả sau "Địa chỉ:" cho đến khi gặp "Phương thức:" hoặc "Tỉnh/Thành:" hoặc dòng mới
    let addressMatch = text.match(/(?:địa\s*chỉ|address|dia\s*chi|diachi)\s*[:\-]?\s*([^\n]*?)(?=\s*(?:phương\s*thức|phuong\s*thuc|payment|method|tỉnh\/thành|tinh\/thanh|tổng\s*tiền|tong\s*tien|total|thanh\s*to[aá]n|thành\s*tiền|stt|$|\n))/i);
    if (!addressMatch) {
      addressMatch = text.match(/(?:địachỉ)\s*[:\-]?\s*([^\n]*?)(?=\s*(?:phương\s*thức|phuong\s*thuc|payment|method|tỉnh\/thành|tinh\/thanh|tổng\s*tiền|tong\s*tien|total|thanh\s*to[aá]n|thành\s*tiền|stt|$|\n))/i);
    }
    if (addressMatch && addressMatch[1]) {
      address = addressMatch[1].trim();
      
      // Tách riêng nếu có "Trạng thái" hoặc "Đã hoàn thành" ở đầu
      const statusMatch = address.match(/^(?:đã\s*hoàn\s*thành|đang\s*xử\s*lý|đã\s*hủy|trạng\s*thái)\s*(.+)/i);
      if (statusMatch) {
        address = statusMatch[1].trim();
      }
      
      // Tách riêng nếu có "Phương thức" ở cuối
      const methodMatch = address.match(/(.+?)(?:\s+phương\s*thức|phuong\s*thuc|payment|method)\s*[:\-]?\s*/i);
      if (methodMatch && methodMatch[1]) {
        address = methodMatch[1].trim();
      }
      
      // Tách riêng nếu có "Tỉnh/Thành:" ở cuối (chỉ khi có từ khóa rõ ràng)
      const provinceKeywordMatch = address.match(/(.+?)(?:\s+)(?:tỉnh\/thành|tinh\/thanh)\s*[:\-]?\s*/i);
      if (provinceKeywordMatch && provinceKeywordMatch[1]) {
        address = provinceKeywordMatch[1].trim();
      }
      
      // Loại bỏ số tiền nếu có
      address = address.replace(/\s*[\d.,]+\s*(?:vnđ|vnd|đ|dong).*$/i, '').trim();
      // Loại bỏ dấu chấm phẩy ở cuối nhưng giữ dấu phẩy trong địa chỉ
      address = address.replace(/[.;]+$/, '').trim();
    }
  }

  if (!province) {
    // Tìm tỉnh/thành trong text, có thể bị dính với phương thức
    let provinceMatch = text.match(/(?:tỉnh\/thành|tinh\/thanh|tỉnh|thành|tp|tp\.|thành\s*phố)\s*[:\-]?\s*([A-ZÀ-ỹ\s]+)/i);
    if (!provinceMatch) {
      // Thử tìm nếu bị dính: "cod Tinh/Thanh: Binh Dương"
      provinceMatch = text.match(/(?:cod|banking|momo|zalopay)\s+(?:tỉnh\/thành|tinh\/thanh|tỉnh|thành|tp)\s*[:\-]?\s*([A-ZÀ-ỹ\s]+)/i);
    }
    if (provinceMatch) {
      province = provinceMatch[1].trim();
      
      // Loại bỏ phần "Địa chỉ" nếu có (tránh nhầm với địa chỉ)
      province = province.replace(/^địa\s*chỉ\s*[:\-]?\s*/i, '').trim();
      // Loại bỏ số nếu có ở đầu (ví dụ: "Địa chỉ: 69" -> chỉ lấy phần sau)
      province = province.replace(/^\d+\s*/, '').trim();
      // Loại bỏ các phần không cần thiết
      province = province.replace(/\s*(?:tổng\s*tiền|tong\s*tien|total|thanh\s*to[aá]n|phương\s*thức|cod|banking|stt|tên\s*sản\s*phẩm|địa\s*chỉ|dia\s*chi).*$/i, '').trim();
      
      // Chỉ lấy phần đầu (tên tỉnh/thành, thường là 1-3 từ)
      const provinceWords = province.split(/\s+/).filter(word => {
        // Loại bỏ số và từ không hợp lệ
        return !/^\d+$/.test(word) && word.length > 1;
      });
      province = provinceWords.slice(0, 3).join(' ').trim();
      
      // Validate: tỉnh/thành không được là số hoặc quá ngắn
      if (province.length < 3 || /^\d+$/.test(province)) {
        province = null;
      }
    }
  }

  if (!status) {
    const statusMatch = text.match(/(?:trạng\s*thái|trang\s*thai|status)\s*[:\-]?\s*([A-ZÀ-ỹ\s]+)/i);
    if (statusMatch) {
      status = statusMatch[1].trim();
      status = status.replace(/\s*(?:phương\s*thức|phuong\s*thuc|payment).*$/i, '').trim();
    }
  }

  if (!paymentMethod) {
    let paymentMatch = text.match(/(?:phương\s*thức|phuong\s*thuc|payment|method)\s*[:\-]?\s*([a-z]+)/i);
    if (!paymentMatch) {
      // Thử tìm nếu bị dính với tỉnh/thành: "cod Tinh/Thanh: ..."
      paymentMatch = text.match(/(?:phương\s*thức|phuong\s*thuc|payment|method)\s*[:\-]?\s*([a-z]+)\s+(?:tỉnh\/thành|tinh\/thanh)/i);
    }
    if (paymentMatch) {
      paymentMethod = paymentMatch[1].trim();
      // Chỉ lấy phần đầu (cod, banking, momo, v.v.)
      paymentMethod = paymentMethod.split(/\s+/)[0].trim();
    }
  }

  // Cleanup các giá trị
  if (customerName) {
    customerName = customerName.replace(/[:,\-]+$/, '').trim();
    customerName = customerName.replace(/[0-9\-_]+$/, '').trim();
  }

  if (address) {
    address = address.replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim();
  }

  if (province) {
    province = province.replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim();
  }

  // Format return object với tất cả thông tin
  return {
    total: totalValue,
    orderCode: orderCode,
    date: date,
    customer: customerName,
    phone: phoneNumber,
    address: address,
    province: province,
    status: status,
    paymentMethod: paymentMethod,
    products: products.length > 0 ? products : undefined
  };
};

const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error cleaning up file:', err);
  }
};

// Generate invoice HTML from order
exports.generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get order with items
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    const orderItems = await OrderItem.find({ MaOrder: order._id.toString() });

    // Format date
    const orderDate = new Date(order.NgayLap);
    const formattedDate = orderDate.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // Generate invoice HTML
    const invoiceHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hóa Đơn #${order._id.toString().slice(-8).toUpperCase()}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Arial', sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .invoice-header {
            text-align: center;
            border-bottom: 3px solid #8b5cf6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .invoice-header h1 {
            color: #8b5cf6;
            font-size: 32px;
            margin-bottom: 10px;
        }
        .invoice-header p {
            color: #666;
            font-size: 14px;
        }
        .invoice-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        .info-section h3 {
            color: #333;
            font-size: 16px;
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
        }
        .info-section p {
            color: #666;
            font-size: 14px;
            margin: 5px 0;
        }
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .products-table th {
            background: #8b5cf6;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 14px;
        }
        .products-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
        }
        .products-table tr:hover {
            background: #f9f9f9;
        }
        .text-right {
            text-align: right;
        }
        .total-section {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #8b5cf6;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 16px;
        }
        .total-final {
            font-size: 24px;
            font-weight: bold;
            color: #8b5cf6;
        }
        .invoice-footer {
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .invoice-container {
                box-shadow: none;
            }
            .no-print {
                display: none;
            }
        }
        .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #8b5cf6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        .print-btn:hover {
            background: #7c3aed;
        }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ In Hóa Đơn</button>
    
    <div class="invoice-container">
        <div class="invoice-header">
            <h1>HÓA ĐƠN BÁN HÀNG</h1>
            <p>MegaStore VN - Hệ thống thương mại điện tử</p>
        </div>

        <div class="invoice-info">
            <div class="info-section">
                <h3>Thông tin đơn hàng</h3>
                <p><strong>Mã đơn:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
                <p><strong>Ngày:</strong> ${formattedDate}</p>
                <p><strong>Trạng thái:</strong> ${order.TrangThai}</p>
                <p><strong>Phương thức:</strong> ${order.PhuongThucGiaoHang}</p>
            </div>
            <div class="info-section">
                <h3>Thông tin khách hàng</h3>
                <p><strong>Họ tên:</strong> ${order.hoTenNguoiNhan}</p>
                <p><strong>SĐT:</strong> ${order.sdtNguoiNhan}</p>
                <p><strong>Địa chỉ:</strong> ${order.diaChiChiTiet}</p>
                <p><strong>Tỉnh/Thành:</strong> ${order.tinhThanh}</p>
            </div>
        </div>

        <table class="products-table">
            <thead>
                <tr>
                    <th>STT</th>
                    <th>Tên sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Màu sắc</th>
                    <th>Kích thước</th>
                    <th class="text-right">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                ${orderItems.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.TenSp}</td>
                        <td>${item.SoLuong}</td>
                        <td>${item.MauSac || '-'}</td>
                        <td>${item.KichThuoc || '-'}</td>
                        <td class="text-right">${item.Tong.toLocaleString('vi-VN')} VNĐ</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-row total-final">
                <span>Tổng tiền:</span>
                <span>${order.TongTien.toLocaleString('vi-VN')} VNĐ</span>
            </div>
        </div>

        <div class="invoice-footer">
            <p>Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!</p>
            <p>Hóa đơn này được tạo tự động từ hệ thống MegaStore VN</p>
        </div>
    </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(invoiceHTML);
  } catch (err) {
    console.error('Error generating invoice:', err);
    res.status(500).json({ message: 'Lỗi server khi tạo hóa đơn', error: err.message });
  }
};

exports.uploadInvoice = async (req, res) => {
  const { orderId } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'Thiếu file hóa đơn' });
  }

  // Cho phép test không cần orderId (demo mode)
  const isTestMode = !orderId || orderId === 'test';

  try {
    let order = null;
    if (!isTestMode) {
      order = await Order.findById(orderId);
      if (!order) {
        cleanupFile(file.path);
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      }
    }

    const relativePath = path.posix.join('uploads/invoices', file.filename);

    let invoice;

    // Test mode: không tạo trong DB, chỉ tạo object tạm thời
    if (isTestMode) {
      invoice = {
        imagePath: relativePath,
        status: 'pending',
        _id: 'test-' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else {
      // Normal mode: tạo trong DB
      const invoiceData = {
        orderId: orderId,
        imagePath: relativePath,
        status: 'pending',
      };
      invoice = await Invoice.create(invoiceData);
    }

    try {
      console.log('Bắt đầu OCR với Tesseract...');
      const result = await Tesseract.recognize(file.path, 'vie+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      
      const rawText = result.data.text;
      console.log('OCR Raw Text Length:', rawText.length);
      console.log('OCR Raw Text:', rawText);
      const parsed = parseInvoiceText(rawText);
      console.log('Parsed Result:', JSON.stringify(parsed, null, 2));

      invoice.rawText = rawText;
      invoice.parsed = parsed;
      invoice.status = 'processed';
      
      // Chỉ lưu vào DB nếu không phải test mode
      if (!isTestMode) {
        await invoice.save();
      } else {
        // Test mode: xóa file sau khi xử lý xong (để tránh tích lũy file rác)
        // Giữ lại một lúc để user có thể xem, sau đó xóa
        setTimeout(() => {
          cleanupFile(file.path);
        }, 60000); // Xóa sau 60 giây
      }

      res.status(201).json({ 
        message: 'Đã xử lý hóa đơn thành công', 
        invoice: invoice.toObject ? invoice.toObject() : invoice,
        isTestMode 
      });
    } catch (ocrErr) {
      console.error('OCR error:', ocrErr);
      invoice.status = 'failed';
      invoice.error = ocrErr.message || 'OCR failed';
      
      // Chỉ lưu vào DB nếu không phải test mode
      if (!isTestMode) {
        await invoice.save();
      } else {
        // Test mode: xóa file nếu OCR thất bại
        cleanupFile(file.path);
      }

      return res.status(500).json({
        message: 'OCR hóa đơn thất bại',
        invoice: invoice.toObject ? invoice.toObject() : invoice,
        error: ocrErr.message,
      });
    }
  } catch (err) {
    console.error(err);
    cleanupFile(file?.path);
    res.status(500).json({ message: 'Lỗi server khi xử lý hóa đơn', error: err.message });
  }
};

exports.getInvoiceByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const invoice = await Invoice.findOne({ orderId }).sort({ createdAt: -1 });
    if (!invoice) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi lấy hóa đơn' });
  }
};

exports.listInvoices = async (req, res) => {
  try {
    const { orderId } = req.query;
    const filter = {};
    if (orderId) {
      filter.orderId = orderId;
    }
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách hóa đơn' });
  }
};
