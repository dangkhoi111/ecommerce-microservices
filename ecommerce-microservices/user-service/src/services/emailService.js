const nodemailer = require('nodemailer');

// Cấu hình transporter cho Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Email của bạn
      pass: process.env.EMAIL_PASS   // App password của Gmail
    }
  });
};

// Gửi email quên mật khẩu với mã OTP
const sendForgotPasswordEmail = async (email, otpCode) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Mã xác thực đặt lại mật khẩu - Ecommerce',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Mã xác thực đặt lại mật khẩu</h2>
          <p>Xin chào,</p>
          <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
          <p>Mã xác thực của bạn là:</p>
          <div style="background-color: #f8f9fa; border: 2px solid #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otpCode}</h1>
          </div>
          <p><strong>Lưu ý:</strong></p>
          <ul>
            <li>Mã này chỉ có hiệu lực trong 15 phút</li>
            <li>Không chia sẻ mã này với bất kỳ ai</li>
            <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
          </ul>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            Email này được gửi tự động, vui lòng không trả lời.
          </p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendForgotPasswordEmail
};
