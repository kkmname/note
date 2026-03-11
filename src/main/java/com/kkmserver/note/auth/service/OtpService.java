package com.kkmserver.note.auth.service;

import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import dev.samstevens.totp.util.Utils;

import org.springframework.stereotype.Service;

@Service
public class OtpService {

    private static final String ISSUER = "kkmnote";
    private static final int    DIGITS = 6;
    private static final int    PERIOD = 30;

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final CodeVerifier    codeVerifier;
    private final QrGenerator     qrGenerator    = new ZxingPngQrGenerator();

    public OtpService() {
        TimeProvider    timeProvider    = new SystemTimeProvider();
        CodeGenerator   codeGenerator   = new DefaultCodeGenerator(HashingAlgorithm.SHA1, DIGITS);
        DefaultCodeVerifier verifier    = new DefaultCodeVerifier(codeGenerator, timeProvider);
        verifier.setTimePeriod(PERIOD);
        verifier.setAllowedTimePeriodDiscrepancy(1); /* 앞뒤 1 period 허용 */
        this.codeVerifier = verifier;
    }

    /** 새 Base32 시크릿 생성 */
    public String generateSecret() {
        return secretGenerator.generate();
    }

    /** OTP 코드 검증 */
    public boolean verify(String secret, String code) {
        if (secret == null || code == null) return false;
        return codeVerifier.isValidCode(secret, code.replaceAll("\\s", ""));
    }

    /** QR 코드 Data URI (data:image/png;base64,...) 반환 */
    public String generateQrDataUri(String email, String secret) {
        QrData data = new QrData.Builder()
                .label(email)
                .secret(secret)
                .issuer(ISSUER)
                .algorithm(HashingAlgorithm.SHA1)
                .digits(DIGITS)
                .period(PERIOD)
                .build();
        try {
            byte[] qrBytes = qrGenerator.generate(data);
            return Utils.getDataUriForImage(qrBytes, qrGenerator.getImageMimeType());
        } catch (Exception e) {
            throw new RuntimeException("QR 코드 생성 실패", e);
        }
    }
}
