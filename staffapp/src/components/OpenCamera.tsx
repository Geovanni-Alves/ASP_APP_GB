import React, { useState, useRef, useEffect } from "react";
import {
  CameraType,
  useCameraPermissions,
  useMicrophonePermissions,
  FlashMode,
  CameraView,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Dimensions,
  Image,
  ActivityIndicator,
  Button,
  Animated,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Swiper from "react-native-swiper";
import { Video, ResizeMode } from "expo-av";
import { usePicturesContext } from "../contexts/PicturesContext";
import { useKidsContext } from "../contexts/KidsContext";
import RemoteImage from "./RemoteImage";
import CustomLoading from "./CustomLoading";
import CustomMessageBox from "./CustomMessageBox";

const OpenCamera = ({
  isVisible,
  onSelectOption,
  onClose,
  mode = "photo",
  bucketName = "photos",
  allowMultipleImages = mode === "photo",
  imagesSelectionLimit = 0,
  cameraPermissionText = "Allow the app to access your camera",
  microphonePermissionText = "Allow the app to access your microphone",
  tag = false,
  allowNotes = true,
  saveMediaOnCamera = true,
}) => {
  const { savePhotoInBucket, saveVideoInBucket } = usePicturesContext();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const [mediaUris, setMediaUris] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmMedia, setConfirmMedia] = useState(false);
  //const [showPostButton, setShowPostButton] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedTime, setRecordedTime] = useState(60);
  const [selectedKids, setSelectedKids] = useState([]);
  const [showTagKids, setShowTagKids] = useState(false);
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);
  const rotateValue = useRef(new Animated.Value(0)).current;
  const borderColorValue = useRef(new Animated.Value(0)).current;
  const { kids } = useKidsContext();
  const [searchText, setSearchText] = useState("");
  const [isCustomMessageVisible, setIsCustomMessageVisible] = useState(false);
  const [pickFromGallery, setPickFromGallery] = useState(false);
  const [showSaveOrDiscard, setShowSaveOrDiscard] = useState(false);
  const [mediaLibraryPermission, requestMediaLibraryPermission] =
    MediaLibrary.usePermissions(); // Request media library permissions

  useEffect(() => {
    if (isVisible) {
      if (!mediaLibraryPermission?.granted) {
        requestMediaLibraryPermission(); // Request permissions on mount if not granted
      }
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      const requestPermissions = async () => {
        const cameraPermissionResponse = await requestPermission();
        if (mode === "video") {
          await requestMicrophonePermission();
        }
        if (!cameraPermissionResponse.granted) {
          return;
        }
      };
      requestPermissions();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setMediaUris([]);
      setFacing("back");
      setFlashMode("off");
      setLoading(false);
      setIsTakingPhoto(false);
      setIsRecording(false);
      clearInterval(intervalRef.current);
      setRecordedTime(60);
      setSelectedKids([]);
      setShowTagKids(false);
      setPickFromGallery(false);
      setShowSaveOrDiscard(false);
    }
  }, [isVisible]);

  const filteredKids = searchText
    ? kids.filter((kid) =>
        kid.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : [{ id: "all", name: "All", photo: "barrinha.png" }, ...kids];

  if (!permission || (mode === "video" && !microphonePermission)) {
    return <ActivityIndicator style={{ padding: 50 }} size={"large"} />;
  }

  if (
    !permission.granted ||
    (mode === "video" && !microphonePermission.granted)
  ) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.message}>
          {mode === "video" ? microphonePermissionText : cameraPermissionText}
        </Text>
        <Button
          onPress={
            mode === "video" ? requestMicrophonePermission : requestPermission
          }
          title={`Grant ${
            mode === "video" ? "Microphone" : "Camera"
          } Permission`}
        />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  function toggleFlashMode() {
    setFlashMode((current) =>
      current === "off" ? "on" : current === "on" ? "auto" : "off"
    );
  }

  async function takePicture() {
    if (cameraRef.current && !isTakingPhoto) {
      setIsTakingPhoto(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      setMediaUris([photo.uri]);
      setConfirmMedia(true);
      setIsTakingPhoto(false);
    }
  }

  async function startRecording() {
    if (cameraRef.current && !isRecording) {
      setIsRecording(true);
      animateRecordButton();

      setRecordedTime(60);

      intervalRef.current = setInterval(() => {
        setRecordedTime((time) => {
          if (time <= 1) {
            clearInterval(intervalRef.current); // Stop the interval
            stopRecording(); // Stop recording when time reaches 0
            return 0;
          }
          return time - 1; // Decrement time
        });
      }, 1000);

      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: 60, // 1 minute
        });

        clearInterval(intervalRef.current); // Clear the interval after recording
        setMediaUris([video.uri]); // Set the video URI after recording
        setConfirmMedia(true); // Trigger confirmation state
      } catch (error) {
        console.error("Recording failed:", error);
        clearInterval(intervalRef.current); // Ensure interval is cleared on error
      } finally {
        resetRecordButtonAnimation();
        setIsRecording(false);
        setRecordedTime(60); // Reset timer
      }
    }
  }

  async function stopRecording() {
    if (cameraRef.current && isRecording) {
      clearInterval(intervalRef.current); // Clear the interval
      try {
        await cameraRef.current.stopRecording();
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
      setConfirmMedia(true); // Ensure this is called after stopping recording
      setIsRecording(false);
      setRecordedTime(60);
    }
  }

  function animateRecordButton() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderColorValue, {
          toValue: 1,
          duration: 2000, // Duration for full transition
          useNativeDriver: false, // Needs to be false for color interpolation
        }),
        Animated.timing(borderColorValue, {
          toValue: 0,
          duration: 2000, // Duration for transition back
          useNativeDriver: false,
        }),
      ])
    ).start();
  }

  const borderColorInterpolation = borderColorValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["white", "red"], // Or any colors you prefer
  });

  function resetRecordButtonAnimation() {
    rotateValue.setValue(0); // Reset rotation value
    rotateValue.stopAnimation(); // Stop any ongoing animation
  }

  const rotateInterpolation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  async function pickImageFromGallery() {
    try {
      setPickFromGallery(true);
      setIsTakingPhoto(true);
      setLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          mode === "video"
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5, // 1
        allowsMultipleSelection: allowMultipleImages, //mode === "photo",
        selectionLimit: imagesSelectionLimit,
        preferredAssetRepresentationMode: "current",
        videoMaxDuration: 60 * 1000,
      });

      if (!result.canceled) {
        const videoDurationInSeconds = result.assets[0].duration / 1000;
        if (mode === "video" && videoDurationInSeconds > 60) {
          alert("Please select a video that is less than 60 seconds long.");
          return;
        }
        // Check if the selected video duration exceeds the limit

        const uris = result.assets.map((asset) => asset.uri);
        setMediaUris(uris);
        setConfirmMedia(true);
      }
    } catch (error) {
      console.error("Error picking media from gallery:", error);
    } finally {
      setLoading(false);
      setIsTakingPhoto(false);
    }
  }

  const handleAskForNote = async () => {
    if (allowNotes) {
      setIsCustomMessageVisible(true);
    } else {
      handleFinishPhotoOrVideo();
      return;
    }
  };

  // const handleFinishPhotoOrVideo = async (notes = "") => {
  //   const savedMediaPaths = await saveMedia(); // Save media paths

  //   if (selectedKids.length > 0) {
  //     setShowTagKids(false);
  //     const validKids = selectedKids.filter((kidId) => kidId !== "all");

  //     // Always pass parameters in the same order: media paths, valid kids, and notes
  //     onSelectOption(savedMediaPaths, validKids, notes);
  //   } else {
  //     // Pass media paths, an empty array for selected kids, and notes
  //     onSelectOption(savedMediaPaths, [], notes);
  //   }

  //   onClose(); // Close the modal
  // };

  const handleFinishPhotoOrVideo = async (notes = "") => {
    let savedMediaPaths = [];

    if (saveMediaOnCamera) {
      savedMediaPaths = await saveMedia(); // Save media to storage
    } else {
      savedMediaPaths = mediaUris; // Directly return mediaUris if not saving
    }

    // Return the media paths via onSelectOption callback
    if (selectedKids.length > 0) {
      setShowTagKids(false);
      const validKids = selectedKids.filter((kidId) => kidId !== "all");
      onSelectOption(savedMediaPaths, validKids, notes);
    } else {
      onSelectOption(savedMediaPaths, [], notes);
    }

    onClose(); // Close the modal
  };

  // const handleSaveWithoutTag = async () => {
  //   const mediaPath = await saveMedia();
  //   onSelectOption(mediaPath[0]);
  //   onClose();
  // };

  // const handleTaggingComplete = async () => {
  //   setShowTagKids(false); // Close the tagging modal
  //   //setIsCustomMessageVisible(true);
  //   const savedMediaPaths = await saveMedia();

  //   const validKids = selectedKids.filter((kidId) => kidId !== "all");
  //   onSelectOption(savedMediaPaths, validKids); // Pass the saved media path to the parent
  //   onClose();
  // };

  const handleSaveToGallery = async (uri) => {
    try {
      if (!mediaLibraryPermission?.granted) {
        const permission = await requestMediaLibraryPermission();
        if (!permission.granted) {
          alert("Permission to access gallery is required!");
        }
      }
      await MediaLibrary.createAssetAsync(uri);
      alert("media saved at gallery");
    } catch (error) {
      console.error("Error saving media to gallery:");
    }
  };

  async function saveMedia() {
    setLoading(true);
    try {
      const mediaPaths = [];
      let mediaPath = "";

      if (mode === "photo") {
        for (const uri of mediaUris) {
          mediaPath = await savePhotoInBucket({ uri }, bucketName);
          mediaPaths.push(mediaPath);
        }
      } else if (mode === "video") {
        mediaPath = await saveVideoInBucket(mediaUris[0], bucketName);
        mediaPaths.push(mediaPath);
      }
      return mediaPaths;
    } catch (error) {
      console.error("Error saving media to storage", error);
    } finally {
      setLoading(false);
    }
  }

  const handleCloseRetake = async () => {
    setShowSaveOrDiscard(true);
  };

  const handleSave = async () => {
    //console.log("handle save...");
    setShowSaveOrDiscard(false);
    setMediaUris([]);
    setConfirmMedia(false); // Close confirmation screen
    setRecordedTime(60);
    setIsTakingPhoto(false); // Reset camera state
    await handleSaveToGallery(mediaUris[0]);
  };

  const handleClose = async () => {
    setShowSaveOrDiscard(false);
    setMediaUris([]);
    setConfirmMedia(false); // Close confirmation screen
    setRecordedTime(60);
    setIsTakingPhoto(false);
  };

  const renderKidItem = ({ item }) => {
    const isSelected = selectedKids.includes(item.id);

    return (
      <TouchableOpacity onPress={() => toggleKidSelection(item.id)}>
        <View style={styles.kidContainer}>
          <View
            style={[
              styles.imageContainer,
              isSelected && styles.selectedImageContainer, // Apply border if selected
            ]}
          >
            <RemoteImage
              path={item.photo}
              name={item.name}
              style={styles.image}
              bucketName="profilePhotos"
            />
          </View>
          <Text style={styles.kidName}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const toggleKidSelection = (kidId) => {
    if (kidId === "all") {
      if (selectedKids.includes("all")) {
        setSelectedKids([]); // Deselect all if "All" is already selected
      } else {
        setSelectedKids(["all", ...kids.map((kid) => kid.id)]); // Select all kids
      }
    } else {
      setSelectedKids((prevSelected) =>
        prevSelected.includes(kidId)
          ? prevSelected.filter((id) => id !== kidId)
          : [...prevSelected.filter((id) => id !== "all"), kidId]
      );
    }
  };

  if (loading) {
    return (
      <Modal visible={isVisible} animationType="slide" transparent={true}>
        <CustomLoading imageSize={80} text="Loading..." />
        {/* <Text style={styles.loadingText}>Loading...</Text> */}
      </Modal>
    );
  }

  if (mediaUris?.length > 0) {
    return (
      <Modal visible={isVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1 }}>
          <Swiper
            loop={false}
            showsPagination={true}
            activeDotStyle={styles.activeDot}
            dotStyle={styles.dot}
          >
            {mode === "photo"
              ? mediaUris.map((uri, index) => (
                  <Image
                    key={index}
                    source={{ uri: uri }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                ))
              : mediaUris.map((uri, index) => (
                  <Video
                    key={index}
                    source={{ uri: uri }}
                    style={styles.fullScreenImage}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                  />
                ))}
          </Swiper>
          {confirmMedia && (
            <>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  if (!pickFromGallery) {
                    handleCloseRetake();
                  } else {
                    setMediaUris([]);
                    setRecordedTime(60);
                    setPickFromGallery(false);
                    setConfirmMedia(false);
                  }
                }}
              >
                <Ionicons name="close" size={25} color="white" />
              </TouchableOpacity>
              <View style={styles.bottomContainer}>
                <TouchableOpacity
                  style={styles.bottomButton}
                  onPress={() => {
                    if (!pickFromGallery) {
                      handleCloseRetake();
                    } else {
                      setMediaUris([]);
                      setRecordedTime(60);
                      setPickFromGallery(false);
                      setConfirmMedia(false);
                    }
                  }}
                >
                  <Text style={styles.bottomText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bottomButton}
                  onPress={() => {
                    setConfirmMedia(false);
                    if (tag) {
                      setShowTagKids(true);
                    } else if (bucketName != "profilePhotos") {
                      if (allowNotes) {
                        setIsCustomMessageVisible(true);
                      } else {
                        handleFinishPhotoOrVideo();
                      }

                      //setShowPostButton(true);
                    } else {
                      handleFinishPhotoOrVideo();
                    }
                  }}
                >
                  <Text style={styles.bottomText}>
                    Use {mode === "video" ? "Video" : "Photo"}
                    {mediaUris?.length > 1 ? "s" : ""}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {showTagKids && (
            <View style={styles.tagOverlay}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowTagKids(false);
                  setConfirmMedia(true);
                }}
              >
                <Ionicons name="arrow-back" size={25} color="white" />
              </TouchableOpacity>
              <KeyboardAvoidingView
                style={styles.tagContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
              >
                <View style={styles.tagContainer}>
                  <Text style={styles.tagTitle}>Tag Kids</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search Kid"
                    placeholderTextColor="gray"
                    value={searchText}
                    onChangeText={(text) => setSearchText(text)}
                  />
                  <FlatList
                    data={filteredKids}
                    renderItem={renderKidItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  />
                  {selectedKids?.length > 0 && (
                    <TouchableOpacity
                      style={styles.doneButton}
                      //onPress={handleTaggingComplete}
                      onPress={handleAskForNote}
                    >
                      <Text style={styles.doneButtonText}>
                        Post {mode === "video" ? "Video" : "Photo"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </KeyboardAvoidingView>
            </View>
          )}
          {/* {showPostButton && (
            <View style={styles.tagOverlay}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowPostButton(false);
                  setConfirmMedia(true);
                }}
              >
                <Ionicons name="arrow-back" size={25} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneButton}
                //onPress={handleSaveWithoutTag}
                onPress={handleAskForNote}
              >
                <Text style={styles.doneButtonText}>
                  Post {mode === "video" ? "Video" : "Photo"}
                </Text>
              </TouchableOpacity>
            </View>
          )} */}
        </View>
        <CustomMessageBox
          isVisible={isCustomMessageVisible}
          onClose={() => setIsCustomMessageVisible(false)}
          header={`Do you want to add a note to this ${
            mode === "photo" ? "photo" : "video"
          }?`}
          infoItems={[]}
          showTextInput={true}
          textInputPlaceholder="Write a note..."
          confirmButtonText="Yes, add a note" // Custom confirm button text
          cancelButtonText="No, post without notes" // Custom cancel button text
          onSubmit={(action, inputValue) => {
            if (inputValue) {
              handleFinishPhotoOrVideo(inputValue);
            } else {
              //console.log("no note added");
              handleFinishPhotoOrVideo();
            }
          }}
        />
        <CustomMessageBox
          isVisible={showSaveOrDiscard}
          onClose={() => setShowSaveOrDiscard(false)}
          header={`Save ${mode === "photo" ? "photo" : "video"} to gallery?`}
          infoItems={[]}
          confirmButtonText="Save"
          cancelButtonText="Discard"
          onSubmit={(action) => {
            if (action === "Yes") {
              handleSave();
            } else {
              handleClose();
            }
            //setShowSaveOrDiscard(false);
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing={facing}
          flash={flashMode}
          mode={mode}
          ref={cameraRef}
          autofocus="on"
        >
          <View style={styles.cameraContainer}>
            <View style={styles.topBar}>
              {mode === "video" && (
                <Text style={styles.timerText}>{formatTime(recordedTime)}</Text>
              )}
              {!isRecording && (
                <>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                  >
                    <Ionicons name="close" size={29} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.flashButton}
                    onPress={toggleFlashMode}
                  >
                    <MaterialIcons
                      name={
                        flashMode === "on"
                          ? "flash-on"
                          : flashMode === "auto"
                          ? "flash-auto"
                          : "flash-off"
                      }
                      size={25}
                      color="white"
                    />
                  </TouchableOpacity>
                </>
              )}
            </View>
            <View style={styles.bottomBar}>
              {!isRecording && (
                <TouchableOpacity
                  style={styles.button}
                  onPress={pickImageFromGallery}
                >
                  <View style={styles.iconBackground}>
                    <Ionicons name="images-outline" size={25} color="white" />
                  </View>
                </TouchableOpacity>
              )}
              {mode === "photo" ? (
                <>
                  <TouchableOpacity
                    style={styles.takePictureButton}
                    onPress={takePicture}
                    disabled={isTakingPhoto}
                  >
                    <View style={styles.outerCircle}>
                      <View style={styles.innerCircle} />
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.takePictureButton}
                    onPress={isRecording ? stopRecording : startRecording}
                  >
                    <Animated.View
                      style={[
                        styles.outerCircleVideo,
                        {
                          transform: [
                            {
                              rotate: rotateInterpolation, // Apply rotation animation
                            },
                          ],
                          borderColor: isRecording
                            ? borderColorInterpolation
                            : "white",
                        },
                      ]}
                    >
                      {isRecording ? (
                        <View style={styles.innerSquareVideo} />
                      ) : (
                        <View style={styles.innerCircleVideo} />
                      )}
                    </Animated.View>
                  </TouchableOpacity>
                </>
              )}
              {!isRecording && (
                <TouchableOpacity
                  style={styles.button}
                  onPress={toggleCameraFacing}
                >
                  <View style={styles.iconBackground}>
                    <Ionicons
                      name="camera-reverse-outline"
                      size={25}
                      color="white"
                    />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
};

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

export default OpenCamera;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  cameraContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    height: 70, // Smaller height for top bar
    backgroundColor: "black",
    //flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  bottomBar: {
    height: 130, // Adjusted height for bottom bar
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    justifyContent: "space-around",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  closeButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 50,
    padding: 10,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
    color: "#000",
  },
  flashButton: {
    position: "absolute",
    top: 23,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 50,
    padding: 10,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
    //width: Dimensions.get("window").width,
    //height: Dimensions.get("window").height,
  },

  button: {
    alignItems: "center",
  },
  takePictureButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  outerCircle: {
    width: 60,
    height: 60,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  innerCircle: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: "white",
  },
  innerSquareVideo: {
    width: 25,
    height: 25,
    backgroundColor: "red",
    borderRadius: 3,
  },
  outerCircleVideo: {
    width: 60,
    height: 60,
    borderRadius: 35,
    borderWidth: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  innerCircleVideo: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: "red",
  },
  iconBackground: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 50,
    padding: 10,
  },
  fullScreenImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "black",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  bottomButton: {
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 10,
  },
  bottomText: {
    color: "white",
    fontSize: 15,
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  loadingContainer: {
    width: 200,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: "#000",
  },
  activeDot: {
    backgroundColor: "white",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dot: {
    backgroundColor: "gray",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerText: {
    color: "white",
    fontSize: 18,
    alignSelf: "center",
    marginTop: 32,
    backgroundColor: "red",
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 2,
    paddingBottom: 2,
  },
  tagOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end", // aligns tagContainer at the bottom
    paddingBottom: 5,
  },
  tagContainer: {
    //backgroundColor: "black",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingTop: 2,
    paddingBottom: 2,
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  tagTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    //marginBottom: 10,
  },
  kidContainer: {
    //backgroundColor: "red",
    padding: 1,
    marginRight: 5,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  imageContainer: {
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#c7c7c1",
  },
  selectedImageContainer: {
    borderWidth: 3,
    borderColor: "#18a32b",
    borderRadius: 50,
  },
  kidName: {
    color: "white", //"#000",
    fontWeight: "400",
    //marginTop: 3,
  },
  doneButton: {
    marginTop: 5,
    marginBottom: 10,
    backgroundColor: "#00f",
    padding: 12,
    borderRadius: 5,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    //marginRight: 10,
  },
  doneButtonText: {
    color: "#fff",
    textAlign: "center",
  },
});
