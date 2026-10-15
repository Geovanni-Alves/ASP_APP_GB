import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import api from "../../lib/api";
import { Input } from "antd";

// Address search box. Replaces GoogleMapsAutocomplete (no Google key needed).
// It asks OUR API (GET /geocode/autocomplete) and calls onPlaceSelect with an object that has
// the same shape Google used to return, so the screens that use it do not change:
//   place.formatted_address, place.geometry.location.lat()/lng(), place.address_components[]

// Turns one result of our API into the "Google-like" place object the screens expect
const toPlace = (result) => ({
  // formatted_address: result.label, // the full text, e.g. for a school address
  formatted_address: [
    result.line1,
    result.city,
    result.province,
    result.postalCode,
    result.country,
  ]
    .filter(Boolean)
    .join(", "),
  street_address: result.line1, // only the street line, e.g. "453 West 12th Avenue" (not a Google field)
  geometry: {
    location: {
      lat: () => result.lat,
      lng: () => result.lng,
    },
  },
  address_components: [
    { long_name: result.city, types: ["locality"] },
    { long_name: result.province, types: ["administrative_area_level_1"] },
    { long_name: result.postalCode, types: ["postal_code"] },
    { long_name: result.country, types: ["country"] },
  ],
});

const styles = {
  wrapper: { position: "relative" },
  list: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 2000, // above the antd modal
    margin: 0,
    padding: 0,
    listStyle: "none",
    background: "#fff",
    border: "1px solid #d9d9d9",
    borderRadius: 6,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    maxHeight: 240,
    overflowY: "auto",
  },
  item: { padding: "8px 12px", cursor: "pointer", fontSize: 13 },
  hint: { fontSize: 12, color: "#888", marginTop: 4 },
};

const AddressAutocomplete = forwardRef(
  ({ onPlaceSelect, defaultValue }, ref) => {
    const [text, setText] = useState(defaultValue || "");
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [searchFailed, setSearchFailed] = useState(false);
    const [hovered, setHovered] = useState(-1);
    const skipNextSearch = useRef(false); // true after we set the text ourselves (selection / reset)
    const wrapperRef = useRef(null);

    // Lets the parent clear the box: ref.current.resetAutocompleteInput()
    useImperativeHandle(ref, () => ({
      resetAutocompleteInput: () => {
        skipNextSearch.current = true;
        setText("");
        setResults([]);
        setOpen(false);
      },
    }));

    useEffect(() => {
      if (defaultValue) {
        skipNextSearch.current = true;
        setText(defaultValue);
      }
    }, [defaultValue]);

    // Search while typing, waiting 400 ms after the last key (so we do not call the API on every letter)
    useEffect(() => {
      if (skipNextSearch.current) {
        skipNextSearch.current = false;
        return undefined;
      }
      const query = text.trim();
      if (query.length < 3) {
        setResults([]);
        setOpen(false);
        return undefined;
      }

      let cancelled = false; // ignore answers that arrive after a newer search started
      const timer = setTimeout(async () => {
        try {
          const { data } = await api.get("/geocode/autocomplete", {
            params: { q: query, limit: 5 },
          });
          if (cancelled) return;
          setSearchFailed(false);
          setResults(data);
          setOpen(true);
        } catch (error) {
          if (cancelled) return;
          console.error("Address search failed:", error);
          setSearchFailed(true);
          setResults([]);
        }
      }, 400);

      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [text]);

    // Close the list when the user clicks outside of the component
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (result) => {
      const place = toPlace(result);
      skipNextSearch.current = true;
      setText(place.formatted_address); // show only the address, as it will be saved
      setResults([]);
      setOpen(false);
      onPlaceSelect(place);
    };

    return (
      <div style={styles.wrapper} ref={wrapperRef}>
        <Input
          type="text"
          value={text}
          placeholder="Start typing an address"
          onChange={(e) => setText(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {open && results.length > 0 && (
          <ul style={styles.list}>
            {results.map((result, index) => (
              <li
                key={`${result.label}-${index}`}
                style={{
                  ...styles.item,
                  background: hovered === index ? "#f0f5ff" : "#fff",
                }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(-1)}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep the input from losing focus before the click is handled
                  handleSelect(result);
                }}
              >
                {result.label}
              </li>
            ))}
          </ul>
        )}
        {searchFailed && (
          <div style={styles.hint}>
            Address search is unavailable. You can type the address in the
            fields below.
          </div>
        )}
      </div>
    );
  },
);

export default AddressAutocomplete;
