// src/lib/files.js
// Everything the dashboard needs to upload, show and delete photos/videos.
// Replaces supabase.storage. The database only stores the returned "path" (the file name).

import api from "./api";

// Upload a File (from an <input type="file">) to a bucket.
// Returns the stored file name ("path") that you save in the database.
//   const path = await uploadFile("profilePhotos", file);
export const uploadFile = async (bucket, file) => {
  const form = new FormData();
  form.append("file", file);
  // axios sets the multipart header (with its boundary) by itself when the body is FormData
  const { data } = await api.post(`/files/${bucket}`, form);
  return data.path;
};

// Ask the API for a temporary link to show a private file in an <img>/<video> tag.
// The link carries its own signature, so the browser needs no token to open it.
//   const url = await getSignedUrl("profilePhotos", student.photo);
export const getSignedUrl = async (bucket, path, seconds = 7200) => {
  const { data } = await api.get("/files/signed-url", {
    params: { bucket, path, expires: seconds },
  });
  // The API answers with a relative link; put the API address in front of it.
  return `${api.defaults.baseURL}${data.signedUrl}`;
};

// Delete a stored file.
export const deleteFile = async (bucket, path) => {
  await api.delete(`/files/${bucket}/${path}`);
};
