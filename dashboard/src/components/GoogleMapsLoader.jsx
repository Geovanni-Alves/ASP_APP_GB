import { useEffect } from "react";

const GoogleMapsLoader = () => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      console.warn("❌ Google Maps API key is missing");
      return;
    }

    if (document.getElementById("google-maps-script")) return;

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.type = "module";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=beta&modules=placeautocomplete`;

    document.body.appendChild(script);
  }, [apiKey]);

  return null;
};

export default GoogleMapsLoader;
