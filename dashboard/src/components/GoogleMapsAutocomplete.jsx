import React, { useRef, useEffect, useState, useCallback } from "react";

const GoogleMapsAutocomplete = React.forwardRef(
  ({ onPlaceSelect, defaultValue }, ref) => {
    const autocompleteInput = useRef(null);
    const libInjectionRequired = useRef(!Boolean(window.google));
    const libLoading = useRef(false);
    const [autocomplete, setAutocomplete] = useState();
    const apikey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    const handlePlaceSelect = useCallback(() => {
      if (autocomplete) {
        const selectedPlace = autocomplete.getPlace();
        if (selectedPlace) {
          onPlaceSelect(selectedPlace);
        }
      }
    }, [onPlaceSelect, autocomplete]);

    useEffect(() => {
      const initAutocomplete = () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          const vancouverBounds = new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(49.199601, -123.227638),
            new window.google.maps.LatLng(49.317079, -123.02377)
          );

          setAutocomplete(
            new window.google.maps.places.Autocomplete(
              autocompleteInput.current,
              {
                bounds: vancouverBounds,
                componentRestrictions: { country: "CA" },
              }
            )
          );
        }
      };

      const loadGoogleMapsScript = () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          initAutocomplete();
        } else {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apikey}&libraries=places&callback=initAutocomplete`;
          script.async = true;
          script.defer = true;

          script.onload = () => {
            initAutocomplete();
          };

          document.head.appendChild(script);
        }
      };

      // Load the Google Maps script
      loadGoogleMapsScript();

      return () => {
        window.handlePlaceSelect = undefined;
        window.initAutocomplete = undefined;
      };
    }, [apikey]);

    useEffect(() => {
      let listener;
      if (autocomplete) {
        listener = autocomplete.addListener("place_changed", handlePlaceSelect);

        return () => {
          if (listener) {
            window.google.maps.event.removeListener(listener);
          }
        };
      }
    }, [autocomplete, handlePlaceSelect]);

    useEffect(() => {
      // Assign the ref to the input element
      if (ref) {
        ref.current = {
          resetAutocompleteInput,
        };
      }
    }, [ref]);

    const resetAutocompleteInput = () => {
      if (autocompleteInput.current) {
        autocompleteInput.current.value = "";
      }
    };

    useEffect(() => {
      // Set default value if provided
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
