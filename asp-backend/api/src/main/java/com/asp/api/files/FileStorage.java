package com.asp.api.files;

import java.io.IOException;
import java.io.InputStream;
import org.springframework.core.io.Resource;

/**
 * Where uploaded files (photos, videos) are kept.
 * Today: a folder on disk (LocalFileStorage). In the cloud this can be swapped for an
 * S3-compatible implementation without touching the controller or the apps.
 */
public interface FileStorage {

    /** Saves the data under a new random name and returns that name (no folders). */
    String save(String bucket, InputStream data, String extension) throws IOException;

    /** Returns the stored file, or null when it does not exist. */
    Resource load(String bucket, String name);

    /** Deletes a file. Returns true when something was deleted. */
    boolean delete(String bucket, String name) throws IOException;
}
