package com.ai.fridge.modules.app.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetMailService {

  private final JavaMailSender mailSender;
  private final String fromAddress;

  public PasswordResetMailService(
      JavaMailSender mailSender,
      @Value("${app.mail.from:no-reply@fridge-ai.local}") String fromAddress) {
    this.mailSender = mailSender;
    this.fromAddress = fromAddress;
  }

  public void sendForgotPasswordOtp(String recipientEmail, String otpCode, long expiresInSeconds) {
    long expiresInMinutes = Math.max(1, expiresInSeconds / 60);

    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(fromAddress);
    message.setTo(recipientEmail);
    message.setSubject("[Fridge AI] Mã xác thực đặt lại mật khẩu");
    message.setText(
        """
        Xin chào,

        Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Fridge AI.
        Mã OTP của bạn là: %s

        Mã có hiệu lực trong %d phút.
        Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.

        Trân trọng,
        Fridge AI Team
        """
            .formatted(otpCode, expiresInMinutes));

    mailSender.send(message);
  }
}
