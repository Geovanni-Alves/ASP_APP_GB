// src/components/RemoteImage.js
// A picture that lives on our server. The files need the login, so the app asks the API for a temporary
// link first. While it loads (or when there is no picture) the initials of the name show instead.
import React, { useEffect, useState } from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import { getSignedUrl } from "../lib/api";

// The links are kept for a while, so that a list does not ask again for the same picture
const cache = new Map(); // "bucket/path" -> { url, expiresAt }
const KEEP_MS = 50 * 60 * 1000; // the links last 60 minutes: they are renewed a little before

async function linkFor(bucket, path) {
  const key = `${bucket}/${path}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const url = await getSignedUrl(bucket, path, 3600);
  cache.set(key, { url, expiresAt: Date.now() + KEEP_MS });
  return url;
}

const initialsOf = (name) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");

const RemoteImage = ({
  path,
  name,
  bucketName = "profilePhotos",
  style,
  resizeMode = "cover",
}) => {
  const [uri, setUri] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUri(null);
    setFailed(false);
    if (!path) return undefined;

    linkFor(bucketName, path)
      .then((url) => {
        if (!cancelled) setUri(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [path, bucketName]);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={style}
        resizeMode={resizeMode}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[style, local.fallback]}>
      <Text style={local.initials}>{initialsOf(name)}</Text>
    </View>
  );
};

const local = StyleSheet.create({
  fallback: {
    backgroundColor: "#e7e3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#5337E0", fontWeight: "700", fontSize: 18 },
});

export default RemoteImage;
