package com.kkmserver.note;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class BCryptPasswordGeneratorTest {
    
    private static final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public static void main(String[] args) {
        String rawPassword = "password";
        String encodedPassword = passwordEncoder.encode(rawPassword);
        System.out.println("Raw Password: " + rawPassword);
        System.out.println("Encoded Password: " + encodedPassword);
    }
}

