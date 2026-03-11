package com.kkmserver.note.auth.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.kkmserver.note.auth.payload.AuthRequest;
import com.kkmserver.note.auth.service.OtpService;
import com.kkmserver.note.user.domain.User;
import com.kkmserver.note.user.domain.UserPrincipal;
import com.kkmserver.note.user.repository.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.AllArgsConstructor;

@RestController
@AllArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String SESSION_PENDING_EMAIL = "otp:pendingEmail";

    private final AuthenticationManager authenticationManager;
    private final OtpService            otpService;
    private final UserRepository        userRepository;

    /**
     * 1단계: 아이디/비밀번호 검증.
     * - OTP 미설정 유저 → 바로 세션 발급 (하위 호환)
     * - OTP 설정 유저  → 세션에 pendingEmail 저장 후 "otp_required" 반환
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req, HttpServletRequest request) {
        try {
            UsernamePasswordAuthenticationToken token =
                    new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword());
            Authentication auth = authenticationManager.authenticate(token);

            User user = userRepository.findByEmail(req.getEmail())
                    .orElseThrow(() -> new IllegalStateException("User not found"));

            if (user.getTotpSecret() != null) {
                /* OTP 설정됨 → pending 세션 저장, 2단계 요구 */
                HttpSession session = request.getSession(true);
                session.setAttribute(SESSION_PENDING_EMAIL, user.getEmail());
                return ResponseEntity.ok(Map.of("step", "otp_required"));
            }

            /* OTP 미설정 → 즉시 로그인 */
            completeLogin(auth, request);
            return ResponseEntity.ok(Map.of("step", "done"));

        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "아이디 또는 비밀번호가 올바르지 않습니다."));
        }
    }

    /**
     * 2단계: OTP 코드 검증 후 세션 발급.
     */
    @PostMapping("/login/otp")
    public ResponseEntity<?> verifyOtp(@RequestBody AuthRequest req, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        String pendingEmail = session != null
                ? (String) session.getAttribute(SESSION_PENDING_EMAIL) : null;

        if (pendingEmail == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "먼저 아이디/비밀번호를 입력해주세요."));
        }

        User user = userRepository.findByEmail(pendingEmail).orElse(null);
        if (user == null || !otpService.verify(user.getTotpSecret(), req.getOtp())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "OTP 코드가 올바르지 않습니다."));
        }

        session.removeAttribute(SESSION_PENDING_EMAIL);
        Authentication auth = new UsernamePasswordAuthenticationToken(
                new UserPrincipal(user), null,
                new UserPrincipal(user).getAuthorities());
        completeLogin(auth, request);
        return ResponseEntity.ok(Map.of("step", "done"));
    }

    /**
     * OTP 시크릿 발급 + QR URI 반환 (최초 등록용).
     * 이미 시크릿이 있으면 재발급하지 않고 기존 QR 반환.
     */
    @PostMapping("/otp/setup")
    public ResponseEntity<?> otpSetup(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean authenticated = auth != null && auth.isAuthenticated()
                && !(auth instanceof AnonymousAuthenticationToken);
        if (!authenticated) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String email = auth.getName();
        User user = userRepository.findByEmail(email).orElseThrow();

        if (user.getTotpSecret() == null) {
            user.setTotpSecret(otpService.generateSecret());
            userRepository.save(user);
        }

        String qrUri = otpService.generateQrDataUri(email, user.getTotpSecret());
        return ResponseEntity.ok(Map.of("qrUri", qrUri, "secret", user.getTotpSecret()));
    }

    @GetMapping("/status")
    public ResponseEntity<?> status() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean authenticated = auth != null && auth.isAuthenticated()
                && !(auth instanceof AnonymousAuthenticationToken);
        if (authenticated) {
            return ResponseEntity.ok(Map.of("authenticated", true, "principal", auth.getName()));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("authenticated", false));
        }
    }

    @RequestMapping(path = "/logout", method = { RequestMethod.GET, RequestMethod.POST })
    public ResponseEntity<?> logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return ResponseEntity.ok(Map.of("message", "logged out"));
    }

    private void completeLogin(Authentication auth, HttpServletRequest request) {
        SecurityContextHolder.getContext().setAuthentication(auth);
        HttpSession session = request.getSession(true);
        session.setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                SecurityContextHolder.getContext());
    }
}
