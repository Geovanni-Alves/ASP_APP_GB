package com.asp.api.invites;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Sends the emails. In development the SMTP server is Mailpit (a fake mailbox in Docker,
 * http://localhost:8025): nothing leaves your computer. In production the SMTP settings
 * (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD...) point to a real email provider.
 */
@Service
public class MailService {

    private final JavaMailSender sender;
    private final String from;
    private final String appName;

    public MailService(JavaMailSender sender,
                       @Value("${app.mail.from}") String from,
                       @Value("${app.mail.app-name}") String appName) {
        this.sender = sender;
        this.from = from;
        this.appName = appName;
    }

    public void sendInvite(String to, String firstName, String code, int validDays) {
        String greeting = (firstName == null || firstName.isBlank()) ? "Hi," : "Hi " + firstName + ",";

        String body = greeting + "\n\n"
            + "You have been invited to the " + appName + ", where you can follow your child's "
            + "after school activities.\n\n"
            + "1. Download the " + appName + " on your phone.\n"
            + "2. Open it and tap \"I have an invite\".\n"
            + "3. Enter this email address and your invite code, then choose a password.\n\n"
            + "Your invite code: " + code + "\n\n"
            + "The code is valid for " + validDays + " days and can be used only once.\n"
            + "If you were not expecting this invitation, you can ignore this message.\n";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("You're invited to the " + appName);
        message.setText(body);

        try {
            sender.send(message);
        } catch (MailException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not send the email");
        }
    }
}
