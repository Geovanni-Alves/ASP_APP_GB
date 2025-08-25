import React, { useEffect, useRef, useCallback } from "react";
import { Loader } from "@googlemaps/js-api-loader";

const GoogleMapsAutocomplete = React.forwardRef(
  ({ onPlaceSelect, defaultValue }, ref) => {
    const autocompleteInput = useRef(null);
    const autocompleteRef = useRef(null); // Use ref instead of state
    const apikey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    const handlePlaceSelect = useCallback(() => {
      if (autocompleteRef.current) {
        const selectedPlace = autocompleteRef.current.getPlace();
        if (selectedPlace && selectedPlace.geometry) {
          onPlaceSelect(selectedPlace);
        }
      }
    }, [onPlaceSelect]);

    useEffect(() => {
      let isMounted = true; // Prevent state updates if component unmounts

      const initAutocomplete = () => {
        if (autocompleteInput.current && window.google?.maps?.places) {
          const vancouverBounds = new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(49.199601, -123.227638),
            new window.google.maps.LatLng(49.317079, -123.02377)
          );

          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            autocompleteInput.current,
            {
              bounds: vancouverBounds,
              componentRestrictions: { country: "CA" },
            }
          );

          autocompleteRef.current.addListener(
            "place_changed",
            handlePlaceSelect
          );
        }
      };

      const loadGoogleMapsScript = async () => {
        if (window.google?.maps?.places) {
          // If Google Maps is already loaded, initialize directly
          initAutocomplete();
          return;
        }

        try {
          const loader = new Loader({
            apiKey: apikey,
            version: "weekly",
            libraries: ["places"],
          });

          await loader.load();
          if (isMounted) initAutocomplete();
        } catch (error) {
          console.error("Google Maps API failed to load", error);
        }
      };

      loadGoogleMapsScript();

      return () => {
        isMounted = false;
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(
            autocompleteRef.current
          );
        }
      };
    }, [apikey, handlePlaceSelect]); // ✅ No 'autocomplete' in dependencies, avoiding infinite loop

    useEffect(() => {
      if (ref) {
        ref.current = { resetAutocompleteInput };
      }
    }, [ref]);

    const resetAutocompleteInput = () => {
      if (autocompleteInput.current) {
        autocompleteInput.current.value = "";
      }
    };

    useEffect(() => {
      if (defaultValue && autocompleteInput.current) {
        autocompleteInput.current.value = defaultValue;
      }
    }, [defaultValue]);

    return (
      <div>
        <input
          ref={autocompleteInput}
          type="text"
          placeholder="Enter a location"
        />
      </div>
    );
  }
);

export default GoogleMapsAutocomplete;
