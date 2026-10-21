package com.asp.api.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwt;
    private final ActiveUsers activeUsers;

    public JwtAuthFilter(JwtService jwt, ActiveUsers activeUsers) {
        this.jwt = jwt;
        this.activeUsers = activeUsers;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims claims = jwt.parse(header.substring(7));
                // A deactivated or deleted user is treated as not logged in, even with a valid token.
                // The role is the one the person has NOW (not the one the token was made with).
                String role = activeUsers.activeRole(UUID.fromString(claims.getSubject()));
                if (role != null) {
                    var auth = new UsernamePasswordAuthenticationToken(
                        claims.getSubject(), null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (JwtException | IllegalArgumentException e) {
                // invalid or expired token: continue unauthenticated (the request will end up as 401)
            }
        }
        chain.doFilter(request, response);
    }
}
