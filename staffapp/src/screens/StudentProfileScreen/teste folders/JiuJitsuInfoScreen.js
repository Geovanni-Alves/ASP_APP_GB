import React from "react";
import { View, Text, TextInput } from "react-native";
import styles from "./styles";

const JiuJitsuInfoScreen = ({ belt, stripes, setBelt, setStripes }) => {
  return (
    <View style={styles.tabContainer}>
      <Text>Belt</Text>
      <TextInput style={styles.input} value={belt} onChangeText={setBelt} />
      <Text>Stripes</Text>
      <TextInput
        style={styles.input}
        value={stripes.toString()}
        onChangeText={(text) => setStripes(Number(text))}
      />
    </View>
  );
};

export default JiuJitsuInfoScreen;
