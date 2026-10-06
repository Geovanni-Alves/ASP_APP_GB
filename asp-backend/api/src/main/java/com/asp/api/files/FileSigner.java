package com.asp.api.files;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Creates and checks "signed links" for files.
 * An <img> tag cannot send an Authorization header, so a logged-in user first asks the API for a
 * signed link (valid for a limited time) and the browser then loads the image from that link.
 * The signature is an HMAC of bucket + file name + expiry time: it cannot be forged or extended.
 */
@Component
public class FileSigner {

    private final byte[] key;

    public FileSigner(@Value("${app.files.secret}") String secret) {
        this.key = ("files:" + secret).getBytes(StandardCharsets.UTF_8);
    }

    public String sign(String bucket, String name, long expiresAtEpochSeconds) {
        return hmac(bucket + "\n" + name + "\n" + expiresAtEpochSeconds);
    }

    public boolean verify(String bucket, String name, long expiresAtEpochSeconds, String signature) {
        if (expiresAtEpochSeconds < Instant.now().getEpochSecond()) {
            return false; // link expired
        }
        byte[] expected = sign(bucket, name, expiresAtEpochSeconds).getBytes(StandardCharsets.UTF_8);
        byte[] given = signature.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, given); // constant-time comparison
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
