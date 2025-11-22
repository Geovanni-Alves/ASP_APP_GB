import React, { useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
} from "react-native";
import { MAPBOX_TOKEN } from "@env";

export default function AddressAutocomplete({ onSelect, defaultValue = "" }) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState([]);

  const handleSearch = async (text) => {
    setQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          text
        )}.json?country=CA&proximity=-123.1216,49.2827&types=address,place,locality&limit=5&access_token=${MAPBOX_TOKEN}`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error("Error, address not founded:", error);
    }
  };

  const handleSelect = (item) => {
    setQuery(item.place_name);
    setSuggestions([]);
    if (onSelect) {
      onSelect({
        address: item.place_name,
        lat: item.center[1],
        lng: item.center[0],
      });
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        value={query}
        onChangeText={handleSearch}
        placeholder="Enter the address..."
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          left: -5,
          padding: 10,
          borderRadius: 8,
        }}
      />

      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleSelect(item)}>
            <Text style={{ padding: 8 }}>{item.place_name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
