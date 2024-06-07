import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Button, Card, Title, Paragraph } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { supabase } from "../../lib/supabase";

const NotStudentScreen = () => {
  const handleCall = () => {
    const phoneNumber = "+12368652297";
    const phoneNumberWithPrefix = `tel:${phoneNumber}`;

    Linking.canOpenURL(phoneNumberWithPrefix)
      .then((supported) => {
        if (!supported) {
          console.error("Phone number not supported");
        } else {
          return Linking.openURL(phoneNumberWithPrefix);
        }
      })
      .catch((error) => console.error(error));
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Hello!!</Title>
          <Paragraph>
            It looks like your little champ is not in our after school program.
            Please get in contact with us to register him. If you have already
            registered, please call the ASP manager at:
          </Paragraph>
          <View style={styles.centeredContainer}>
            <TouchableOpacity onPress={handleCall} style={styles.phoneButton}>
              <MaterialIcons name="call" size={24} color="white" />
              <Text style={styles.phoneNumber}> +1 (236) 865-2297</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={() => supabase.auth.signOut()}>
            Back to Login
          </Button>
        </Card.Actions>
      </Card>
    </View>
  );
};

export default NotStudentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  card: {
    width: "90%",
    padding: 16,
    elevation: 4,
  },
  centeredContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 25,
  },
  phoneButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    marginTop: 5,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "rgb(2, 119, 247)",
    borderColor: "rgb(2, 119, 247)",
  },
  phoneNumber: {
    fontWeight: "bold",
    color: "white",
    //color: "#ff6347",
    marginLeft: 8,
  },
});
