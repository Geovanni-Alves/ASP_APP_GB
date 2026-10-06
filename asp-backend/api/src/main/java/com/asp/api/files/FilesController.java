package com.asp.api.files;

import com.asp.api.auth.Roles;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Photos and videos.
 *
 *   POST   /files/{bucket}                 multipart field "file"  -> { bucket, path }
 *   GET    /files/signed-url?bucket=&path= -> { signedUrl }  (logged-in users)
 *   GET    /files/{bucket}/{name}?exp=&sig= -> the file itself (the signed link is the "key")
 *   DELETE /files/{bucket}/{name}          -> { deleted }
 *
 * The database only stores the returned "path" (a random file name), exactly like before.
 * For now every endpoint except the signed download requires a staff/admin user.
 */
@RestController
@RequestMapping("/files")
public class FilesController {

    // Same bucket names the old Supabase storage used.
    private static final Set<String> BUCKETS = Set.of(
        "vans", "profilePhotos", "schoolexitphotos", "feedPhotos", "feedVideos", "photos", "videos");

    // Allowed upload types -> the extension we store. Anything else is rejected.
    private static final Map<String, String> EXTENSIONS = Map.of(
        "image/jpeg", "jpg",
        "image/jpg", "jpg",
        "image/png", "png",
        "image/webp", "webp",
        "image/gif", "gif",
        "image/heic", "heic",
        "image/heif", "heif",
        "video/mp4", "mp4",
        "video/quicktime", "mov");

    // Stored extension -> the Content-Type we answer with (never trust the uploader's header).
    private static final Map<String, String> CONTENT_TYPES = Map.of(
        "jpg", "image/jpeg",
        "png", "image/png",
        "webp", "image/webp",
        "gif", "image/gif",
        "heic", "image/heic",
        "heif", "image/heif",
        "mp4", "video/mp4",
        "mov", "video/quicktime");

    private static final Pattern SAFE_NAME = Pattern.compile("^[A-Za-z0-9._-]{1,200}$");

    private final FileStorage storage;
    private final FileSigner signer;

    public FilesController(FileStorage storage, FileSigner signer) {
        this.storage = storage;
        this.signer = signer;
    }

    @PostMapping("/{bucket}")
    public Map<String, String> upload(@PathVariable String bucket,
                                      @RequestParam("file") MultipartFile file,
                                      Authentication auth) throws IOException {
        Roles.requireStaff(auth);
        requireBucket(bucket);
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String extension = EXTENSIONS.get(type);
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Unsupported file type: " + type);
        }
        String name;
        try (InputStream in = file.getInputStream()) {
            name = storage.save(bucket, in, extension);
        }
        return Map.of("bucket", bucket, "path", name);
    }

    @GetMapping("/signed-url")
    public Map<String, String> signedUrl(@RequestParam String bucket,
                                         @RequestParam String path,
                                         @RequestParam(defaultValue = "3600") long expires,
                                         Authentication auth) {
        Roles.requireStaff(auth);
        requireBucket(bucket);
        requireName(path);
        if (storage.load(bucket, path) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        long seconds = Math.min(Math.max(expires, 60), 86_400); // between 1 minute and 24 hours
        long expiresAt = Instant.now().getEpochSecond() + seconds;
        String signature = signer.sign(bucket, path, expiresAt);

        // Relative link: the client adds the API address in front of it.
        return Map.of("signedUrl", "/files/" + bucket + "/" + path + "?exp=" + expiresAt + "&sig=" + signature);
    }

    // Public endpoint on purpose (an <img> tag cannot send a token): the signature is the protection.
    @GetMapping("/{bucket}/{name}")
    public ResponseEntity<Resource> download(@PathVariable String bucket,
                                             @PathVariable String name,
                                             @RequestParam long exp,
                                             @RequestParam String sig) {
        requireBucket(bucket);
        requireName(name);
        if (!signer.verify(bucket, name, exp, sig)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid or expired link");
        }
        Resource resource = storage.load(bucket, name);
        if (resource == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        String extension = name.substring(name.lastIndexOf('.') + 1).toLowerCase();
        String contentType = CONTENT_TYPES.getOrDefault(extension, "application/octet-stream");

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .header("X-Content-Type-Options", "nosniff")
            .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
            .body(resource);
    }

    @DeleteMapping("/{bucket}/{name}")
    public Map<String, Integer> delete(@PathVariable String bucket,
                                       @PathVariable String name,
                                       Authentication auth) throws IOException {
        Roles.requireStaff(auth);
        requireBucket(bucket);
        requireName(name);
        return Map.of("deleted", storage.delete(bucket, name) ? 1 : 0);
    }

    private void requireBucket(String bucket) {
        if (!BUCKETS.contains(bucket)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown bucket: " + bucket);
        }
    }

    private void requireName(String name) {
        if (!SAFE_NAME.matcher(name).matches() || name.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
        }
    }
}
