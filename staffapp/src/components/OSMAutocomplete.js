import React, { useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
} from "react-native";

export default function OSMAutocomplete({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const fetchSuggestions = async (text) => {
    setQuery(text);
    if (!text) {
      setResults([]);
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        text + ", British Columbia, Canada"
      )}&format=json&addressdetails=1&limit=5`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "MyApp/1.0 (youremail@example.com)",
        },
      });

      if (!res.ok) {
        console.error("Nominatim returned status:", res.status);
        setResults([]);
        return;
      }

      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error("Nominatim error:", e);
    }
  };

  return (
    <View>
      <TextInput
        value={query}
        onChangeText={fetchSuggestions}
        placeholder="Enter address"
        style={{ borderWidth: 1, padding: 8 }}
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.place_id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              onSelect(item);
              setQuery(item.display_name);
              setResults([]);
            }}
          >
            <Text style={{ padding: 8 }}>{item.display_name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
