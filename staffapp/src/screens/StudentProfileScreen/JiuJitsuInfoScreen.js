import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import BeltStriped from "../../components/BeltStriped";
import { supabase } from "../../lib/supabase";

/*
  Jiu-Jitsu info screen:
  - Belt color (kids)
  - Stripes (editable)
  - Saves into asp_details table
*/

const beltColors = [
  { label: "White", value: "white", hex: "#ffffff" },
  { label: "Gray", value: "gray", hex: "#b5b5b5" },
  { label: "Yellow", value: "yellow", hex: "#ffe44c" },
  { label: "Orange", value: "orange", hex: "#f8a13c" },
  { label: "Green", value: "green", hex: "#3ea66b" },
];

export default function JiuJitsuInfoScreen({ kid, readOnly }) {
  const [beltColor, setBeltColor] = useState("white");
  const [stripes, setStripes] = useState([]);

  // Load data from asp_details
  useEffect(() => {
    fetchDetails();
  }, []);

  const fetchDetails = async () => {
    const { data } = await supabase
      .from("asp_details")
      .select("*")
      .eq("student_id", kid.id)
      .single();

    if (data) {
      setBeltColor(data.bjj_belt_color || "white");
      setStripes(data.bjj_stripes || []);
    }
  };

  const saveDetails = async () => {
    const { error } = await supabase.from("asp_details").upsert({
      student_id: kid.id,
      bjj_belt_color: beltColor,
      bjj_stripes: stripes,
      type: "bjj",
    });

    if (!error) alert("Saved!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Jiu-Jitsu Info</Text>

      <BeltStriped
        mainColor={beltColors.find((b) => b.value === beltColor).hex}
        stripes={stripes}
        readOnly={readOnly}
        onAddStripe={() => {
          setStripes([...stripes, { color: "white" }]);
        }}
        onRemoveStripe={(i) => {
          const newArr = stripes.filter((_, idx) => idx !== i);
          setStripes(newArr);
        }}
        onChangeStripe={(i, newColor) => {
          const arr = [...stripes];
          arr[i].color = newColor;
          setStripes(arr);
        }}
      />

      {!readOnly && (
        <>
          <Text style={styles.subtitle}>Belt Color</Text>
          <View style={styles.row}>
            {beltColors.map((b) => (
              <TouchableOpacity
                key={b.value}
                onPress={() => setBeltColor(b.value)}
              >
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: b.hex },
                    beltColor === b.value && styles.selectedDot,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveDetails}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  subtitle: { marginTop: 20, fontSize: 18 },
  row: { flexDirection: "row", marginTop: 10 },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  selectedDot: {
    borderWidth: 3,
    borderColor: "#007bff",
  },
  saveBtn: {
    backgroundColor: "#28a745",
    marginTop: 25,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  saveText: {
    color: "white",
    fontWeight: "bold",
  },
});
