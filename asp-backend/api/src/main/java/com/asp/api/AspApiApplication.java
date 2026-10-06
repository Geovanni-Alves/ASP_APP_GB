package com.asp.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// Exclude the default Spring Security user: login is handled by our own "users" table.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class AspApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(AspApiApplication.class, args);
    }
}
