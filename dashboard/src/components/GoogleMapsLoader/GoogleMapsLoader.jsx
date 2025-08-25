// components/GoogleMapsLoader.jsx
import { useEffect } from "react";

const GOOGLE_SCRIPT_ID = "google-maps-script";
export const GOOGLE_READY_EVENT = "google-maps-loaded";

export default function GoogleMapsLoader() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      console.warn("❌ Google Maps API key is missing");
      return;
    }
    if (document.getElementById(GOOGLE_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.async = true;
    script.defer = true;

    // ✅ Use recommended params: v=weekly + loading=async
    // If you need places, keep &libraries=places
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`;

    script.addEventListener("load", () => {
      // Signal “ready” to any listeners
      window.dispatchEvent(new Event(GOOGLE_READY_EVENT));
    });

    document.body.appendChild(script);

    return () => {
      // Optional: don’t remove the script to allow reuse across pages
    };
  }, [apiKey]);

  return null;
}
