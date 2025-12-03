import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";

/*
  This component renders a kids Jiu-Jitsu belt following the
  IBJJF / GB Future Champions system:

  - Full colored belt (mainColor)
  - White end section (where stripes are placed)
  - Stripes: white | black | red
*/

export default function BeltStriped({
  mainColor = "#ffffff",
  stripes = [], // array of { color: "white" | "black" | "red" }
  readOnly = true,
  onAddStripe,
  onRemoveStripe,
  onChangeStripe,
}) {
  return (
    <View style={styles.container}>
      {/* Full colored belt */}
      <View style={[styles.beltMain, { backgroundColor: mainColor }]} />

      {/* White stripe area where stripes are placed */}
      <View style={styles.whiteEnd}>
        {/* Render each stripe */}
        <View style={styles.stripeRow}>
          {stripes.map((stripe, index) => (
            <TouchableOpacity
              key={index}
              disabled={readOnly}
              onPress={() => {
                if (onChangeStripe) {
                  // Cycle colors: white → black → red → white
                  const next =
                    stripe.color === "white"
                      ? "black"
                      : stripe.color === "black"
                      ? "red"
                      : "white";
                  onChangeStripe(index, next);
                }
              }}
            >
              <View
                style={[
                  styles.stripe,
                  stripe.color === "white" && { backgroundColor: "#ffffff" },
                  stripe.color === "black" && { backgroundColor: "#000000" },
                  stripe.color === "red" && { backgroundColor: "#cc0000" },
                ]}
              />
            </TouchableOpacity>
          ))}

          {/* Add new stripe button (+) */}
          {!readOnly && stripes.length < 4 && (
            <TouchableOpacity onPress={onAddStripe}>
              <View style={styles.addButton} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 40,
    alignItems: "center",
  },

  beltMain: {
    flex: 1,
    height: "100%",
    borderWidth: 1,
    borderColor: "#333",
  },

  whiteEnd: {
    width: 120,
    height: "100%",
    backgroundColor: "#f7f7f7",
    borderLeftWidth: 2,
    borderColor: "#333",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  stripeRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  stripe: {
    width: 10,
    height: 30,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#222",
  },

  addButton: {
    width: 10,
    height: 30,
    backgroundColor: "#cccccc",
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#999",
  },
});
