import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";

const ShowMessage = ({ visible, message, buttons, onResponse }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <View
          style={{
            backgroundColor: "white",
            padding: 20,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "black", // Add border styling
          }}
        >
          <Text style={{ fontSize: 18, marginBottom: 10 }}>{message}</Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              marginTop: 20,
            }}
          >
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => onResponse(button)}
                style={{
                  backgroundColor: button === "Confirm" ? "green" : "red", // Button-specific background color
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "white" }}>{button}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ShowMessage;
