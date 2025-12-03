import React from "react";
import { View, StyleSheet } from "react-native";

/*
  BeltDisplay Component
  ---------------------
  This component visually renders a Jiu-Jitsu belt with:
    - A colored main belt area
    - A realistic black bar (wider and positioned away from the left edge)
    - Optional stripes (white or red)
  
  Props:
    beltColor: string  -> main belt color
    stripes: number    -> number of white stripes (0–4)
    hasRedStripe: bool -> if true, the FIRST stripe is red
    height: number     -> visual height of the belt
*/

const beltColors = {
  white: "#ffffff",
  gray: "#bfbfbf",
  yellow: "#f5d400",
  orange: "#ff8c00",
  green: "#0f8b4c",
  blue: "#1557a3",
  purple: "#6a2b8a",
  brown: "#4a2c13",
  black: "#000000",
};

export default function BeltDisplay({
  beltColor = "white",
  stripes = 0,
  hasRedStripe = false,
  height = 45,
}) {
  // Stripe width
  const stripeWidth = 10;

  // Build stripe blocks
  const allStripes = [];
  for (let i = 0; i < stripes; i++) {
    allStripes.push({
      color: i === 0 && hasRedStripe ? "red" : "white",
    });
  }

  return (
    <View style={[styles.beltContainer, { height }]}>
      {/* MAIN BELT AREA */}
      <View
        style={[
          styles.mainBelt,
          { backgroundColor: beltColors[beltColor] || beltColor },
        ]}
      />

      {/* BLACK BAR (realistic placement) */}
      <View style={styles.blackBar}>
        <View style={styles.blackBarInner}>
          {/* Render stripes inside the bar */}
          {allStripes.map((stripe, index) => (
            <View
              key={index}
              style={[
                styles.stripe,
                {
                  backgroundColor: stripe.color,
                  width: stripeWidth,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* END OF BELT (stitched edge) */}
      <View style={styles.beltTip} />
    </View>
  );
}

const styles = StyleSheet.create({
  beltContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  mainBelt: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#888",
  },

  blackBar: {
    width: 90, // ⬅ black bar now wider
    marginLeft: 12, // ⬅ moved slightly to the left (more realistic)
    marginRight: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  blackBarInner: {
    backgroundColor: "black",
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },

  stripe: {
    height: "90%",
    marginHorizontal: 3,
  },

  beltTip: {
    width: 25,
    height: "100%",
    borderWidth: 2,
    borderColor: "#888",
    backgroundColor: "#e6e6e6",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
});
