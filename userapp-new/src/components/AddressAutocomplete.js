// src/components/AddressAutocomplete.js
import React, { useEffect, useRef, useState } from "react";
import { View, TextInput, Text, TouchableOpacity } from "react-native";
import api from "../lib/api";

// Address search with our own API (it replaces the Mapbox and Google searches).
// onSelect receives: { address, line1, city, province, zipCode, country, lat, lng }
//   address = the whole line ("453 West 12th Avenue, Vancouver, British Columbia, V5Y 1V4, Canada")
//   line1   = only the street line ("453 West 12th Avenue")
export default function AddressAutocomplete({
  onSelect,
  defaultValue = "",
  containerStyle, // optional: changes the box around the field
  inputStyle, // optional: changes the field itself
}) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState([]);
  const timer = useRef(null);

  // The address that was already saved (it can arrive after the screen opened)
  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleSearch = (text) => {
    setQuery(text);
    clearTimeout(timer.current);

    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    // Wait until the person stops typing (the search is not asked for every letter)
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/geocode/autocomplete", {
          params: { q: text.trim(), limit: 5 },
        });
        setSuggestions(data);
      } catch (error) {
        console.error(
          "Address search failed:",
          error?.response?.data || error.message,
        );
      }
    }, 400);
  };

  const handleSelect = (item) => {
    setQuery(item.label);
    setSuggestions([]);
    if (onSelect) {
      onSelect({
        address: item.label,
        line1: item.line1,
        city: item.city,
        province: item.province,
        zipCode: item.postalCode,
        country: item.country,
        lat: item.lat,
        lng: item.lng,
      });
    }
  };

  return (
    <View style={[{ padding: 16 }, containerStyle]}>
      <TextInput
        value={query}
        onChangeText={handleSearch}
        placeholder="Enter the address..."
        style={[
          {
            borderWidth: 1,
            borderColor: "#ccc",
            left: -5,
            padding: 10,
            borderRadius: 8,
          },
          inputStyle,
        ]}
      />

      {suggestions.map((item) => (
        <TouchableOpacity key={item.label} onPress={() => handleSelect(item)}>
          <Text style={{ padding: 8 }}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
