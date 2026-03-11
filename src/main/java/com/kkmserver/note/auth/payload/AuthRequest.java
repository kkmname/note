package com.kkmserver.note.auth.payload;

public class AuthRequest {
    private String email;
    private String password;
    private String otp; /* 2단계: Google Authenticator 6자리 */

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
}
