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
import { useVideoPlayer, VideoView } from "expo-video";
import { usePicturesContext } from "../contexts/PicturesContext";
import { useKidsContext } from "../contexts/KidsContext";
import RemoteImage from "./RemoteImage";
import CustomLoading from "./CustomLoading";
import CustomMessageBox from "./CustomMessageBox";
import { useTodayContext } from "../contexts/TodayContext";

// The most photos in a post
const MAX_PHOTOS = 5;

const OpenCamera = ({
  isVisible,
  onSelectOption,
  onClose,
  mode = "photo", // "photo" | "video"
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

  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmMedia, setConfirmMedia] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedTime, setRecordedTime] = useState(60);

  const [selectedKids, setSelectedKids] = useState<string[]>([]);
  const [showTagKids, setShowTagKids] = useState(false);

  const cameraRef = useRef<CameraView | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const rotateValue = useRef(new Animated.Value(0)).current;
  const borderColorValue = useRef(new Animated.Value(0)).current;

  const { kids } = useKidsContext();
  // Only the kids who are HERE today (checked in) can be tagged, so nobody is tagged by mistake
  const { hereKids } = useTodayContext();
  const taggableKids = hereKids(kids);
  const [searchText, setSearchText] = useState("");
  const [isCustomMessageVisible, setIsCustomMessageVisible] = useState(false);
  const [pickFromGallery, setPickFromGallery] = useState(false);
  const [showSaveOrDiscard, setShowSaveOrDiscard] = useState(false);

  // Photos: up to MAX_PHOTOS in a post. After the first ones the person can come back to the camera
  // and add more (the first ones stay), and can remove the photo that is showing.
  const [addingMore, setAddingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0); // the photo showing in the review
  const sessionMax =
    !allowMultipleImages || mode !== "photo" || bucketName === "profilePhotos"
      ? 1
      : Math.min(
          imagesSelectionLimit > 0 ? imagesSelectionLimit : MAX_PHOTOS,
          MAX_PHOTOS,
        );
  const canAddMore = mediaUris.length < sessionMax; // (sessionMax is 1 for a video and for a profile photo)

  const removeCurrentPhoto = () => {
    setMediaUris((previous) => previous.filter((_, i) => i !== currentIndex));
    setCurrentIndex(0);
  };

  const [mediaLibraryPermission, requestMediaLibraryPermission] =
    MediaLibrary.usePermissions();

  // Media Library permission
  useEffect(() => {
    if (isVisible && !mediaLibraryPermission?.granted) {
      requestMediaLibraryPermission();
    }
  }, [isVisible]);

  // const player = useVideoPlayer("", (playerInstance) => {
  //   playerInstance.loop = false;
  // });

  // useEffect(() => {
  //   if (mode === "video" && mediaUris.length > 0) {
  //     player.replace(mediaUris[0]);
  //     player.play();
  //   }
  // }, [mediaUris, mode]);
  const player = useVideoPlayer(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setVideoReady(false);

    if (!isVisible || mode !== "video" || !mediaUris[0]) {
      player.pause();
      return;
    }

    const loadPreview = async () => {
      try {
        console.log("Loading video preview:", mediaUris[0]);

        await player.replaceAsync({
          uri: mediaUris[0],
        });

        if (!cancelled) {
          player.loop = true;
          player.play();
          setVideoReady(true);

          console.log("Video preview loaded");
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading video preview:", error);
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [isVisible, mediaUris, mode, player]);

  // Camera / Mic permission
  useEffect(() => {
    if (isVisible) {
      const requestPermissions = async () => {
        const cameraPermissionResponse = await requestPermission();
        if (!cameraPermissionResponse.granted) return;

        if (mode === "video") {
          await requestMicrophonePermission();
        }
      };
      requestPermissions();
    }
  }, [isVisible, mode]);

  // Reset state when modal close
  useEffect(() => {
    if (!isVisible) {
      setMediaUris([]);
      setFacing("back");
      setFlashMode("off");
      setLoading(false);
      setIsTakingPhoto(false);
      setIsRecording(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRecordedTime(60);
      setSelectedKids([]);
      setShowTagKids(false);
      setPickFromGallery(false);
      setShowSaveOrDiscard(false);
      setConfirmMedia(false);
      setAddingMore(false);
      setCurrentIndex(0);
    }
  }, [isVisible]);

  // "All" only makes sense when there is somebody to tag
  const allOption =
    taggableKids.length > 1
      ? [{ id: "all", name: "All", photo: "barrinha.png" }]
      : [];
  const filteredKids = searchText
    ? taggableKids.filter((kid) =>
        kid.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : [...allOption, ...taggableKids];

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

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const toggleFlashMode = () => {
    setFlashMode((current) =>
      current === "off" ? "on" : current === "on" ? "auto" : "off",
    );
  };

  const takePicture = async () => {
    if (!cameraRef.current || isTakingPhoto) return;
    try {
      setIsTakingPhoto(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
      });
      // One more photo of the post (the first ones stay), up to the limit
      setMediaUris((previous) => [...previous, photo.uri].slice(0, sessionMax));
      setAddingMore(false);
      setConfirmMedia(true);
    } catch (error) {
      console.error("Error taking picture:", error);
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const animateRecordButton = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderColorValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(borderColorValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  };

  const resetRecordButtonAnimation = () => {
    borderColorValue.stopAnimation();
    borderColorValue.setValue(0);
  };

  const borderColorInterpolation = borderColorValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["white", "red"],
  });

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      console.log("Starting recording...");
      setIsRecording(true);
      animateRecordButton();
      setRecordedTime(60);

      intervalRef.current = setInterval(() => {
        setRecordedTime((t) => {
          if (t <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            stopRecording();
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });

      if (intervalRef.current) clearInterval(intervalRef.current);
      setMediaUris([video.uri]);
      setConfirmMedia(true);
    } catch (error) {
      console.error("Recording failed:", error);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } finally {
      resetRecordButtonAnimation();
      // setIsRecording(false);
      setRecordedTime(60);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      if (intervalRef.current) clearInterval(intervalRef.current);
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error("Error stopping recording:", error);
    } finally {
      setIsRecording(false);
      setRecordedTime(60);
    }
  };

  const pickImageFromGallery = async () => {
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
        quality: 0.5,
        allowsMultipleSelection: allowMultipleImages,
        selectionLimit: mode === "video" ? 0 : Math.max(sessionMax - mediaUris.length, 1),
        preferredAssetRepresentationMode: "current",
        videoMaxDuration: 60 * 1000,
      });

      if (!result.canceled) {
        const first = result.assets[0];
        if (mode === "video" && first.duration) {
          const videoDurationInSeconds = first.duration / 1000;
          if (videoDurationInSeconds > 60) {
            alert("Please select a video that is less than 60 seconds long.");
            return;
          }
        }

        const uris = result.assets.map((asset) => asset.uri);
        // Photos are added to the ones already taken (up to the limit); a video replaces
        setMediaUris(
          mode === "photo"
            ? [...mediaUris, ...uris].slice(0, sessionMax)
            : uris,
        );
        setAddingMore(false);
        setConfirmMedia(true);
      }
    } catch (error) {
      console.error("Error picking media from gallery:", error);
    } finally {
      setLoading(false);
      setIsTakingPhoto(false);
    }
  };

  const handleAskForNote = () => {
    if (allowNotes) {
      setIsCustomMessageVisible(true);
    } else {
      handleFinishPhotoOrVideo();
    }
  };

  const handleFinishPhotoOrVideo = async (notes = "") => {
    let savedMediaPaths: string[] = [];

    if (saveMediaOnCamera) {
      savedMediaPaths = await saveMedia();
    } else {
      savedMediaPaths = mediaUris;
    }

    if (selectedKids.length > 0) {
      setShowTagKids(false);
      const validKids = selectedKids.filter((kidId) => kidId !== "all");
      onSelectOption(savedMediaPaths, validKids, notes);
    } else {
      onSelectOption(savedMediaPaths, [], notes);
    }

    onClose();
  };

  const handleSaveToGallery = async (uri: string) => {
    try {
      if (!mediaLibraryPermission?.granted) {
        const permission = await requestMediaLibraryPermission();
        if (!permission.granted) {
          alert("Permission to access gallery is required!");
          return;
        }
      }
      await MediaLibrary.createAssetAsync(uri);
      alert("Media saved to gallery");
    } catch (error) {
      console.error("Error saving media to gallery:", error);
    }
  };

  const saveMedia = async (): Promise<string[]> => {
    setLoading(true);
    try {
      const mediaPaths: string[] = [];

      if (mode === "photo") {
        for (const uri of mediaUris) {
          const mediaPath = await savePhotoInBucket({ uri }, bucketName);
          if (mediaPath) mediaPaths.push(mediaPath);
        }
      } else if (mode === "video" && mediaUris[0]) {
        const mediaPath = await saveVideoInBucket(mediaUris[0], bucketName);
        if (mediaPath) mediaPaths.push(mediaPath);
      }

      return mediaPaths;
    } catch (error) {
      console.error("Error saving media to storage", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRetake = () => {
    setShowSaveOrDiscard(true);
  };

  const handleSave = async () => {
    setShowSaveOrDiscard(false);
    if (mediaUris[0]) {
      await handleSaveToGallery(mediaUris[0]);
    }
    setMediaUris([]);
    setConfirmMedia(false);
    setRecordedTime(60);
    setIsTakingPhoto(false);
  };

  const handleCloseDiscard = () => {
    setShowSaveOrDiscard(false);
    setMediaUris([]);
    setConfirmMedia(false);
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
              isSelected && styles.selectedImageContainer,
            ]}
          >
            <RemoteImage
              path={item.id !== "all" ? item.photo : undefined}
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

  const toggleKidSelection = (kidId: string) => {
    if (kidId === "all") {
      if (taggableKids.length === 0) return; // nobody to choose
      if (selectedKids.includes("all")) {
        setSelectedKids([]);
      } else {
        setSelectedKids(["all", ...taggableKids.map((kid) => kid.id)]);
      }
    } else {
      setSelectedKids((prevSelected) =>
        prevSelected.includes(kidId)
          ? prevSelected.filter((id) => id !== kidId)
          : [...prevSelected.filter((id) => id !== "all"), kidId],
      );
    }
  };

  if (loading) {
    return (
      <Modal visible={isVisible} animationType="slide" transparent={true}>
        <CustomLoading imageSize={80} text="Loading..." />
      </Modal>
    );
  }

  if (mediaUris?.length > 0 && !addingMore) {
    return (
      <Modal visible={isVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: "black" }}>
          <Swiper
            key={mediaUris.length}
            onIndexChanged={setCurrentIndex}
            loop={false}
            showsPagination={true}
            activeDotStyle={styles.activeDot}
            dotStyle={styles.dot}
          >
            {mode === "photo"
              ? mediaUris.map((uri, index) => (
                  <Image
                    key={index}
                    source={{ uri }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                ))
              : mediaUris.map((uri, index) => (
                  // <VideoView
                  //   key={index}
                  //   style={styles.fullScreenImage}
                  //   video={{ uri }}
                  //   useNativeControls
                  //   shouldPlay
                  //   resizeMode="contain"
                  // />
                  <VideoView
                    key={index}
                    player={player}
                    style={styles.fullScreenImage}
                    // nativeControls={true}
                    contentFit="contain"
                  />
                ))}
          </Swiper>

          {/* Which photo it is, and a way to remove it */}
          {confirmMedia && mode === "photo" && (
            <View style={styles.photoTools}>
              <Text style={styles.countText}>
                {currentIndex + 1}/{mediaUris.length}
              </Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={removeCurrentPhoto}
              >
                <Ionicons name="trash-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          )}

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

                {canAddMore && (
                  <TouchableOpacity
                    style={styles.bottomButton}
                    onPress={() => setAddingMore(true)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="camera-outline" size={18} color="white" />
                      <Text style={styles.bottomText}>
                        Add ({mediaUris.length}/{sessionMax})
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.bottomButton}
                  onPress={() => {
                    setConfirmMedia(false);
                    if (tag) {
                      setShowTagKids(true);
                    } else if (bucketName !== "profilePhotos") {
                      if (allowNotes) {
                        setIsCustomMessageVisible(true);
                      } else {
                        handleFinishPhotoOrVideo();
                      }
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
                  {taggableKids.length === 0 && (
                    <Text style={{ color: "white", paddingVertical: 8 }}>
                      Nobody is checked in yet today, so there is nobody to tag.
                    </Text>
                  )}
                  {taggableKids.length > 1 && (
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search Kid"
                      placeholderTextColor="gray"
                      value={searchText}
                      onChangeText={setSearchText}
                    />
                  )}
                  <FlatList
                    data={filteredKids}
                    renderItem={renderKidItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  />
                  {selectedKids.some((id) => id !== "all") && (
                    <TouchableOpacity
                      style={styles.doneButton}
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

          <CustomMessageBox
            isVisible={isCustomMessageVisible}
            onClose={() => {
              setIsCustomMessageVisible(false);
              // Closing the note box (X or back button) goes back to where the person was:
              // the tag list, or the photo with the "Retake" and "Use Photo" buttons
              if (!showTagKids) setConfirmMedia(true);
            }}
            header={`Do you want to add a note to this ${
              mode === "photo" ? "photo" : "video"
            }?`}
            infoItems={[]}
            showTextInput={true}
            textInputPlaceholder="Write a note..."
            confirmButtonText="Yes, add a note"
            cancelButtonText="No, post without notes"
            onSubmit={(action, inputValue) => {
              if (inputValue) {
                handleFinishPhotoOrVideo(inputValue);
              } else {
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
                handleCloseDiscard();
              }
            }}
          />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flashMode}
          mode={mode === "video" ? "video" : "picture"}
        />

        {/* TOP BAR */}
        <View style={styles.topBar}>
          {mode === "video" && (
            <Text style={styles.timerText}>{formatTime(recordedTime)}</Text>
          )}

          {mode === "photo" && mediaUris.length > 0 && (
            <Text style={styles.countText}>
              {mediaUris.length}/{sessionMax} photos
            </Text>
          )}

          {!isRecording && (
            <>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={addingMore ? () => setAddingMore(false) : onClose}
              >
                <Ionicons name="close" size={29} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roundButton}
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
                  color="gold"
                />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* BOTTOM BAR */}
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
            <TouchableOpacity
              // style={styles.takePictureButton}
              onPress={takePicture}
              disabled={isTakingPhoto}
            >
              <View style={styles.captureButton}>
                <View style={styles.captureInner} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.recordOuter}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Animated.View
                style={[
                  styles.outerCircleVideo,
                  {
                    borderColor: isRecording
                      ? borderColorInterpolation
                      : "white",
                  },
                ]}
              >
                {isRecording ? (
                  <View style={styles.recordInner} />
                ) : (
                  <View style={styles.captureInner} />
                )}
              </Animated.View>
            </TouchableOpacity>
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
    </Modal>
  );
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

export default OpenCamera;

const styles = StyleSheet.create({
  countText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  photoTools: {
    position: "absolute",
    top: 80,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 9999,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  // TOP OVERLAY
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  timerText: {
    color: "white",
    fontSize: 18,
    backgroundColor: "red",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 28,
  },

  // flashButton: {
  //   position: "absolute",
  //   top: 23,
  //   right: 20,
  //   zIndex: 10,
  //   backgroundColor: "rgba(0, 0, 0, 0.5)",
  //   borderRadius: 50,
  //   padding: 10,
  // },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 130,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
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

  button: {
    alignItems: "center",
  },
  takePictureButton: {
    alignItems: "center",
    justifyContent: "center",
  },

  outerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  innerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "white",
  },

  outerCircleVideo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  innerCircleVideo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "red",
  },
  innerSquareVideo: {
    width: 30,
    height: 30,
    backgroundColor: "red",
    borderRadius: 4,
  },

  iconBackground: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 50,
    padding: 10,
  },

  fullScreenImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    backgroundColor: "black",
  },

  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },

  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "white",
  },

  recordOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 6,
    borderColor: "red",
  },

  recordInner: {
    width: 40,
    height: 40,
    backgroundColor: "red",
    borderRadius: 8,
  },

  bottomContainer: {
    position: "absolute",
    bottom: 95,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    zIndex: 9999,
    pointerEvents: "box-none",
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

  tagOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    paddingBottom: 5,
  },
  tagContainer: {
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
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
    color: "#000",
  },
  kidContainer: {
    padding: 1,
    marginRight: 5,
    alignItems: "center",
    justifyContent: "center",
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
    color: "white",
    fontWeight: "400",
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
  },
  doneButtonText: {
    color: "#fff",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: 75,
    left: 20,
    width: 45,
    height: 45,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  roundButton: {
    position: "absolute",
    top: 75,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 50,
    padding: 10,
  },
  previewLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
});
