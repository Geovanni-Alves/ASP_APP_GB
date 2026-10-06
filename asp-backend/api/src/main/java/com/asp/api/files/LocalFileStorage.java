package com.asp.api.files;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/** Keeps files on disk: {root}/{bucket}/{random-name}.{ext} */
@Component
public class LocalFileStorage implements FileStorage {

    private final Path root;

    public LocalFileStorage(@Value("${app.files.dir}") String dir) throws IOException {
        this.root = Paths.get(dir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    @Override
    public String save(String bucket, InputStream data, String extension) throws IOException {
        Path folder = inside(root.resolve(bucket));
        Files.createDirectories(folder);
        String name = UUID.randomUUID() + "." + extension;
        Files.copy(data, folder.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        return name;
    }

    @Override
    public Resource load(String bucket, String name) {
        Path file = inside(root.resolve(bucket).resolve(name));
        return Files.isRegularFile(file) ? new FileSystemResource(file) : null;
    }

    @Override
    public boolean delete(String bucket, String name) throws IOException {
        return Files.deleteIfExists(inside(root.resolve(bucket).resolve(name)));
    }

    // Safety net against path traversal: the final path must stay inside the storage root.
    private Path inside(Path path) {
        Path normalized = path.normalize();
        if (!normalized.startsWith(root)) {
            throw new IllegalArgumentException("Invalid path");
        }
        return normalized;
    }
}
