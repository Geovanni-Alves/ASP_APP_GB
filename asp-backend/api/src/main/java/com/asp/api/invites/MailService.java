package com.asp.api.invites;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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

    /** Who receives the invite: the text and the way to activate the account depend on it. */
    public enum Audience {
        PARENT,    // the parent app: type the code in the app
        STAFF,     // the staff app: type the code in the app
        DASHBOARD  // an administrator: a link opens the dashboard with the data already filled in
    }

    private final JavaMailSender sender;
    private final String from;
    private final String appName;
    private final String staffAppName;
    private final String dashboardUrl;

    public MailService(JavaMailSender sender,
                       @Value("${app.mail.from}") String from,
                       @Value("${app.mail.app-name}") String appName,
                       @Value("${app.mail.staff-app-name:ASP Staff App}") String staffAppName,
                       @Value("${app.mail.dashboard-url:http://localhost:5173}") String dashboardUrl) {
        this.sender = sender;
        this.from = from;
        this.appName = appName;
        this.staffAppName = staffAppName;
        // no trailing slash, so we can append paths
        this.dashboardUrl = dashboardUrl.endsWith("/")
            ? dashboardUrl.substring(0, dashboardUrl.length() - 1)
            : dashboardUrl;
    }

    public void sendInvite(String to, String firstName, String code, int validDays, Audience audience) {
        String greeting = (firstName == null || firstName.isBlank()) ? "Hi," : "Hi " + firstName + ",";

        String subject;
        String body;
        switch (audience) {
            case PARENT -> {
                subject = "You're invited to the " + appName;
                body = appInvite(greeting, appName,
                    "where you can follow your child's after school activities.", code, validDays);
            }
            case STAFF -> {
                subject = "You're invited to the " + staffAppName;
                body = appInvite(greeting, staffAppName,
                    "where you work with the after school program.", code, validDays);
            }
            default -> {
                subject = "You're invited to the ASP dashboard";
                body = dashboardInvite(greeting, to, code, validDays);
            }
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);

        try {
            sender.send(message);
        } catch (MailException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not send the email");
        }
    }

    /** The code to reset a password (6 digits, a few minutes). Nothing in it says if the account exists. */
    public void sendPasswordReset(String to, String firstName, String code, int validMinutes) {
        String greeting = (firstName == null || firstName.isBlank()) ? "Hi," : "Hi " + firstName + ",";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Your password reset code");
        message.setText(greeting + "\n\n"
            + "Someone (hopefully you) asked to reset the password of your account.\n\n"
            + "Your code: " + code + "\n\n"
            + "Open the app, type this code with your email address, and choose a new password.\n"
            + "The code is valid for " + validMinutes + " minutes and can be used only once.\n\n"
            + "If you did not ask for this, you can ignore this message: your password has not changed.\n");

        try {
            sender.send(message);
        } catch (MailException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not send the email");
        }
    }

    // The person types the code in a mobile app
    private static String appInvite(String greeting, String app, String purpose, String code, int validDays) {
        return greeting + "\n\n"
            + "You have been invited to the " + app + ", " + purpose + "\n\n"
            + "1. Download the " + app + " on your phone.\n"
            + "2. Open it and tap \"I have an invite\".\n"
            + "3. Enter this email address and your invite code, then choose a password.\n\n"
            + "Your invite code: " + code + "\n\n"
            + footer(validDays);
    }

    // The link carries the email and the code in the part after "#". Browsers never send that part
    // to a server, so the code does not end up in any server log. The dashboard reads it, fills in
    // the form and removes it from the address bar.
    private String dashboardInvite(String greeting, String to, String code, int validDays) {
        String link = dashboardUrl + "/#invite=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
            + "&email=" + URLEncoder.encode(to, StandardCharsets.UTF_8);

        return greeting + "\n\n"
            + "You have been invited to the ASP dashboard, where you manage the after school program.\n\n"
            + "Open this link to activate your account. You only need to choose a password:\n"
            + link + "\n\n"
            + "If the link does not open, go to " + dashboardUrl + ", choose \"I have an invite\" "
            + "and enter this email address and this code: " + code + "\n\n"
            + footer(validDays);
    }

    private static String footer(int validDays) {
        return "The code is valid for " + validDays + " days and can be used only once.\n"
            + "If you were not expecting this invitation, you can ignore this message.\n";
    }
}
