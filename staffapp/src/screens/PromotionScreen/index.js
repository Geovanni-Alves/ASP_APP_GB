import styles from "./styles";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useKidsContext } from "../../contexts/KidsContext";
import RemoteImage from "../../components/RemoteImage";

const currentUser = { role: "admin" }; // Admin check

const PromotionScreen = () => {
  const [stripes, setStripes] = useState(0);
  const [beltColor, setBeltColor] = useState("white");
  const [selectedKid, setSelectedKid] = useState(null);
  const [isModalVisible, setModalVisible] = useState(true);
  const [searchText, setSearchText] = useState("");

  const navigation = useNavigation();
  const route = useRoute();
  const { kids } = useKidsContext();

  const beltColors = [
    { name: "White", color: "white" },
    { name: "Grey/White", color: "greyWhite" },
    { name: "Grey", color: "grey" },
    { name: "Grey/Black", color: "greyBlack" },
    { name: "Yellow/White", color: "yellowWhite" },
    { name: "Yellow", color: "yellow" },
    { name: "Yellow/Black", color: "yellowBlack" },
    { name: "Orange/White", color: "orangeWhite" },
    { name: "Orange", color: "orange" },
    { name: "Orange/Black", color: "orangeBlack" },
    { name: "Green/White", color: "greenWhite" },
    { name: "Green", color: "green" },
    { name: "Green/Black", color: "greenBlack" },
  ];

  const filteredKids = kids.filter((kid) =>
    kid.name.toLowerCase().includes(searchText.toLocaleLowerCase())
  );

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={goBack}>
          <FontAwesome name="arrow-left" size={23} color="#000" />
        </TouchableOpacity>
      ),
      title: selectedKid ? `${selectedKid.name} Promotion` : "Promotion",
    });
  }, [selectedKid]);

  const goBack = () => {
    if (!selectedKid) {
      navigation.goBack();
    }
  };

  // Handle stripe addition and removal
  const addStripe = () => {
    if (currentUser.role === "admin") {
      if (stripes < 4) {
        setStripes(stripes + 1);
      } else {
        Alert.alert("Limit Reached", "Maximum of 4 stripes allowed.");
      }
    } else {
      Alert.alert("Access Denied", "Only admins can change promotions.");
    }
  };

  const removeStripe = () => {
    if (currentUser.role === "admin") {
      if (stripes > 0) {
        setStripes(stripes - 1);
      } else {
        Alert.alert("No Stripes", "There are no stripes to remove.");
      }
    } else {
      Alert.alert("Access Denied", "Only admins can change promotions.");
    }
  };

  const changeBeltColor = (color) => {
    if (currentUser.role === "admin") {
      setBeltColor(color);
    } else {
      Alert.alert("Access Denied", "Only admins can change promotions.");
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedKid(student);
    setModalVisible(false);
  };

  const closeModal = () => {
    if (!selectedKid) {
      setModalVisible(false);
      navigation.goBack(); // Navigate back if no student is selected
    } else {
      setModalVisible(false); // Close modal if a student was selected
    }
  };

  const renderBelt = () => {
    let sideColor, middleColor;
    switch (beltColor) {
      case "greyWhite":
        sideColor = "grey";
        middleColor = "white";
        break;
      case "greyBlack":
        sideColor = "grey";
        middleColor = "black";
        break;
      case "yellowWhite":
        sideColor = "yellow";
        middleColor = "white";
        break;
      case "yellowBlack":
        sideColor = "yellow";
        middleColor = "black";
        break;
      case "orangeWhite":
        sideColor = "orange";
        middleColor = "white";
        break;
      case "orangeBlack":
        sideColor = "orange";
        middleColor = "black";
        break;
      case "greenWhite":
        sideColor = "green";
        middleColor = "white";
        break;
      case "greenBlack":
        sideColor = "green";
        middleColor = "black";
        break;
      default:
        sideColor = beltColor;
        middleColor = beltColor;
    }

    return (
      <View style={styles.belt}>
        <View style={[styles.beltTopBottom, { backgroundColor: sideColor }]} />
        <View style={[styles.beltMiddle, { backgroundColor: middleColor }]} />
        <View style={[styles.beltTopBottom, { backgroundColor: sideColor }]} />
      </View>
    );
  };

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleStudentSelect(item)}>
      <View style={styles.studentItem}>
        <RemoteImage
          path={item.photo}
          name={item.name}
          style={styles.studentImage}
          bucketName="profilePhotos"
        />
        <Text style={styles.studentName}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{selectedKid?.name} Promotion</Text>

      {/* Student Selection Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Student</Text>
            <TextInput
              style={styles.searchBox}
              placeholder="Search Students..."
              value={searchText}
              onChangeText={setSearchText}
            />
            <FlatList
              data={filteredKids}
              keyExtractor={(item) => item.id}
              renderItem={renderStudentItem}
              numColumns={3} // Show 3 kids per row
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.studentList}
            />
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Display Selected Kid */}
      {selectedKid && (
        <View style={styles.studentContainer}>
          <RemoteImage
            path={selectedKid.photo}
            name={selectedKid.name}
            style={styles.studentImage}
            bucketName="profilePhotos"
          />
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.editButton}
          >
            <FontAwesome name="pencil" size={24} color="black" />
          </TouchableOpacity>
        </View>
      )}

      {/* Belt Display */}
      <View style={styles.beltContainer}>
        {renderBelt()}
        <View style={styles.stripesContainer}>
          {Array.from({ length: stripes }).map((_, index) => (
            <View key={index} style={styles.stripe} />
          ))}
        </View>
      </View>

      <Text style={styles.stripesText}>{stripes} Stripe(s)</Text>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity onPress={addStripe} style={styles.button}>
          <Text style={styles.buttonText}>Add Stripe</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={removeStripe} style={styles.button}>
          <Text style={styles.buttonText}>Remove Stripe</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Change Belt Color</Text>

      <View style={styles.beltButtonsContainer}>
        {beltColors.map((belt) => (
          <TouchableOpacity
            key={belt.name}
            onPress={() => changeBeltColor(belt.color)}
            style={[styles.beltButton, { backgroundColor: belt.color }]}
          >
            <Text style={styles.beltButtonText}>{belt.name} Belt</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

export default PromotionScreen;
