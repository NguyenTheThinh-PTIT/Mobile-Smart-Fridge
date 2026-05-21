package com.ai.fridge.common.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRequest {

  @NotBlank(message = "Email không được để trống")
  @Email(message = "Email không hợp lệ")
  private String email;

  @NotBlank(message = "Name không được để trống")
  @Size(min = 2, max = 100, message = "Name phải có độ dài 2-100 ký tự")
  private String name;

  @NotBlank(message = "Password không được để trống")
  @Size(min = 6, message = "Password tối thiểu 6 ký tự")
  private String password;

  @Size(max = 20, message = "Phone tối đa 20 ký tự")
  @Pattern(regexp = "^[0-9+\\-\\s]*$", message = "Phone chỉ chứa số, +, -, khoảng trắng")
  private String phone;

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }
}
