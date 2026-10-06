package com.asp.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// Excluimos o usuario padrao do Spring Security: o login e feito pela nossa tabela "users".
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class AspApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(AspApiApplication.class, args);
    }
}
