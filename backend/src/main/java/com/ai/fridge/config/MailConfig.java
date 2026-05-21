package com.ai.fridge.config;

import java.util.Properties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

@Configuration
public class MailConfig {

  @Bean
  public JavaMailSender javaMailSender(
      @Value("${app.mail.host:sandbox.smtp.mailtrap.io}") String host,
      @Value("${app.mail.port:2525}") int port,
      @Value("${app.mail.username:}") String username,
      @Value("${app.mail.password:}") String password,
      @Value("${app.mail.properties.mail.smtp.auth:true}") boolean smtpAuth,
      @Value("${app.mail.properties.mail.smtp.starttls.enable:true}") boolean startTlsEnable,
      @Value("${app.mail.properties.mail.smtp.starttls.required:false}") boolean startTlsRequired) {

    JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
    mailSender.setHost(host);
    mailSender.setPort(port);
    mailSender.setUsername(username);
    mailSender.setPassword(password);

    Properties props = mailSender.getJavaMailProperties();
    props.put("mail.transport.protocol", "smtp");
    props.put("mail.smtp.auth", String.valueOf(smtpAuth));
    props.put("mail.smtp.starttls.enable", String.valueOf(startTlsEnable));
    props.put("mail.smtp.starttls.required", String.valueOf(startTlsRequired));
    props.put("mail.debug", "false");

    return mailSender;
  }
}
