import React, { useEffect, useState } from "react";
import supabase from "../lib/supabase"; // Make sure to import your Supabase instance

// In-memory cache
const imageCache = {};

const RemoteImage = ({
  path,
  fallback,
  name,
  style,
  bucketName,
  onImageLoaded,
  onlyReturnUrl = false,
  ...imageProps
}) => {
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(true);

  const getInitials = (name) => {
    if (name) {
      const nameArray = name.split(" ");
      return nameArray
        .map((word) => word[0])
        .join("")
        .toUpperCase();
    }
    return "";
  };

  const initials = getInitials(name);

  useEffect(() => {
    if (!path) {
      setImage(null);
      setLoading(false); // Stop loading if there's no path
      return;
    }

    const cachedImage = imageCache[path];
    const now = Date.now();
    const cacheExpiration = 60 * 60 * 1000; // 1 hour

    if (cachedImage && now - cachedImage.timestamp < cacheExpiration) {
      // Use cached URL if valid
      setImage(cachedImage.url);
      setLoading(false);
      if (onImageLoaded) onImageLoaded(cachedImage.url);
    } else {
      (async () => {
        setLoading(true);
        setImage("");

        try {
          const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(path, 60 * 60); // URL valid for 1 hour

          if (error) {
            throw new Error("Error fetching image");
          }
          if (data?.signedUrl) {
            const url = data.signedUrl;
            setImage(url);
            // Cache the signed URL
            imageCache[path] = { url, timestamp: Date.now() };

            if (onImageLoaded) onImageLoaded(url); // Return the URL
          } else {
            throw new Error("Image not found");
          }
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false); // Stop loading in all cases
        }
      })();
    }
  }, [path, bucketName, onImageLoaded]);

  // If onlyReturnUrl is true, do not render the image
  if (onlyReturnUrl) return null;

  const fontSize = style?.height ? style.height / 2 : 20;

  return (
    <div style={{ ...style, ...styles.loaderContainer }}>
      {loading ? (
        <div style={styles.spinner}></div> // Simple spinner for loading state
      ) : image ? (
        <img src={image} alt={name} style={style} {...imageProps} />
      ) : fallback ? (
        <img src={fallback} alt={name} style={style} {...imageProps} />
      ) : (
        <div style={{ ...style, ...styles.initialsContainer }}>
          <span style={{ ...styles.initialsText, fontSize }}>{initials}</span>
        </div>
      )}
    </div>
  );
};

const styles = {
  loaderContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    //backgroundColor: "#00000010",
  },
  initialsContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ccc",
  },
  initialsText: {
    color: "#fff",
  },
  // Simple spinner styles
  spinner: {
    border: "4px solid rgba(0, 0, 0, 0.1)",
    borderLeftColor: "#000",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
  },
};

// CSS for spinner animation (you can add this to your global CSS)
const spinnerStyles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Inject spinner animation CSS into the document head
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = spinnerStyles;
document.head.appendChild(styleSheet);

export default RemoteImage;
