import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import styles from "./styles";
import { useEffect, useCallback } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

const AddressInfoScreen = ({ kid }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.addressContainer}>
      {kid?.useDropOffService ? (
        <ScrollView>
          <Text style={styles.detailLabel}>Current Drop-Off Address:</Text>
          <View style={styles.addressContainer}>
            <View style={{ flex: 1 }}>
              {kid.dropOffAddress && (
                <View>
                  {/* Display houseName on the first line */}
                  {kid.dropOffAddress.houseName && (
                    <Text style={styles.detailTextInput}>
                      {kid.dropOffAddress.houseName}
                    </Text>
                  )}

                  {/* Display the rest of the address on the second line */}
                  <Text style={styles.detailTextInput}>
                    {`${kid.dropOffAddress.addressLine1}, `}
                    {kid.dropOffAddress.unitNumber &&
                      `${kid.dropOffAddress.unitNumber}, `}
                    {`${kid.dropOffAddress.city}, ${kid.dropOffAddress.province}, ${kid.dropOffAddress.zipCode}, ${kid.dropOffAddress.country}`}
                  </Text>

                  {/* Display addressNotes on a separate line */}
                  {kid.dropOffAddress.addressNotes && (
                    <Text style={styles.detailTextInput}>
                      {kid.dropOffAddress.addressNotes}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.dropOffButton}
              onPress={() => {
                navigation.navigate("AddressList", {
                  kidId: kid.id,
                  useDropOff: kid.useDropOffService,
                });
              }}
            >
              <Text style={styles.dropOffButtonText}>
                {kid.dropOffAddress ? "Change / Add more" : "Add new address"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.addressContainer}>
          {kid.dropOffAddress ? (
            <View>
              <Text style={styles.detailLabel}>Address</Text>
              <View>
                <Text style={styles.detailTextInput}>
                  {`${kid.dropOffAddress.addressLine1}, ${
                    kid.dropOffAddress.unitNumber
                      ? `${kid.dropOffAddress.unitNumber}, `
                      : ""
                  }${kid.dropOffAddress.city}, ${
                    kid.dropOffAddress.province
                  }, ${kid.dropOffAddress.zipCode}, ${
                    kid.dropOffAddress.country
                  }`}
                  {`${
                    kid.dropOffAddress.addressNotes
                      ? ` - ${kid.dropOffAddress.addressNotes}`
                      : ""
                  }`}
                </Text>
              </View>
              {kid.dropOffAddress ? (
                <TouchableOpacity
                  style={styles.dropOffButton}
                  onPress={() => {
                    navigation.navigate("AddAddress", {
                      address: kid.dropOffAddress,
                      kidId: kid?.id,
                      mode: "update",
                      from: "kidProfile",
                    });
                  }}
                >
                  <Text style={styles.dropOffButtonText}>Change</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.dropOffButton}
                  onPress={() => {
                    navigation.navigate("AddAddress", {
                      kidId: kid?.id,
                      mode: "insert",
                      from: "kidProfile",
                    });
                  }}
                >
                  <Text style={styles.dropOffButtonText}>Add new address</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.dropOffButton}
              onPress={() => {
                navigation.navigate("AddAddress", {
                  kidId: kid?.id,
                  mode: kid.dropOffAddress ? "update" : "insert",
                  from: "kidProfile",
                });
              }}
            >
              <Text style={styles.dropOffButtonText}>Add new address</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default AddressInfoScreen;
