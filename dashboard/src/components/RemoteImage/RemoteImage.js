import React, { useEffect, useState } from "react";
import supabase from "../../lib/supabase"; // Your Supabase instance

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
  fullscreenOnClick = false, // New prop
  ...imageProps
}) => {
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFullScreen, setShowFullScreen] = useState(false);

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
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showFullScreen) {
        setShowFullScreen(false);
      }
    };

    if (showFullScreen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showFullScreen]);

  useEffect(() => {
    if (!path) {
      setImage(null);
      setLoading(false);
      return;
    }

    const cachedImage = imageCache[path];
    const now = Date.now();
    const cacheExpiration = 60 * 60 * 1000; // 1 hour

    if (cachedImage && now - cachedImage.timestamp < cacheExpiration) {
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
            .createSignedUrl(path, 60 * 60);

          if (error) {
            throw new Error("Error fetching image");
          }
          if (data?.signedUrl) {
            const url = data.signedUrl;
            setImage(url);
            imageCache[path] = { url, timestamp: Date.now() };
            if (onImageLoaded) onImageLoaded(url);
          } else {
            throw new Error("Image not found");
          }
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [path, bucketName, onImageLoaded]);

  if (onlyReturnUrl) return null;

  // const fontSize = style?.height ? style.height / 2 : 20;
  // Safely derive a number from style.height (handles numbers, "40px", "40", etc.)
  const rawH = style?.height;
  const heightNum =
    typeof rawH === "number"
      ? rawH
      : rawH != null
      ? Number.parseFloat(String(rawH).replace("px", ""))
      : NaN;
  const fontSize = Number.isFinite(heightNum) ? heightNum / 2 : 20;

  const FullScreenOverlay = () => (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.9)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
      onClick={() => setShowFullScreen(false)}
    >
      <img
        src={image}
        alt={name}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
          borderRadius: "10px",
        }}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        style={{
          position: "absolute",
          top: "20px",
          right: "30px",
          background: "white",
          color: "black",
          fontSize: "28px",
          border: "none",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
        onClick={() => setShowFullScreen(false)}
      >
        ×
      </button>
    </div>
  );

  return (
    <div style={{ ...style, ...styles.loaderContainer }}>
      {fullscreenOnClick && showFullScreen && <FullScreenOverlay />}
      {loading ? (
        <div style={styles.spinner}></div>
      ) : image ? (
        <img
          src={image}
          alt={name}
          style={{
            ...style,
            cursor: fullscreenOnClick ? "zoom-in" : "default",
          }}
          onClick={() => fullscreenOnClick && setShowFullScreen(true)}
          {...imageProps}
        />
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
  spinner: {
    border: "4px solid rgba(0, 0, 0, 0.1)",
    borderLeftColor: "#000",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
  },
};

// Add keyframe animation to the document for spinner
const spinnerStyles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = spinnerStyles;
document.head.appendChild(styleSheet);

export default RemoteImage;
