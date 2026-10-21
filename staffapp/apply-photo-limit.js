// apply-photo-limit.js
// Adds to OpenCamera.tsx: at most 5 photos in a post, an "Add picture" button to take more after the
// first ones, and a way to remove the photo that is showing.
// Run it from the folder of the staff app:   node apply-photo-limit.js
// It changes NOTHING unless every place it needs is found (and it keeps a copy: OpenCamera.tsx.bak).
const fs = require("fs");
const file = process.argv[2] || "src/components/OpenCamera.tsx";

if (!fs.existsSync(file)) {
  console.error("File not found:", file, "- run this from D:\\Aspapp\\staffapp");
  process.exit(1);
}

const raw = fs.readFileSync(file, "utf8");
const crlf = raw.includes("\r\n");
let src = raw.replace(/\r\n/g, "\n");

if (src.includes("const MAX_PHOTOS")) {
  console.log("Already applied (MAX_PHOTOS is there). Nothing to do.");
  process.exit(0);
}

const edits = [
  {
    name: "the limit (5)",
    old: "const OpenCamera = ({",
    new: `// The most photos in a post
const MAX_PHOTOS = 5;

const OpenCamera = ({`,
  },
  {
    name: "the state and the limit of this post",
    old: "  const [showSaveOrDiscard, setShowSaveOrDiscard] = useState(false);\n",
    new: `  const [showSaveOrDiscard, setShowSaveOrDiscard] = useState(false);

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
`,
  },
  {
    name: "the reset when the camera closes",
    old: "      setShowSaveOrDiscard(false);\n      setConfirmMedia(false);\n    }\n  }, [isVisible]);",
    new: "      setShowSaveOrDiscard(false);\n      setConfirmMedia(false);\n      setAddingMore(false);\n      setCurrentIndex(0);\n    }\n  }, [isVisible]);",
  },
  {
    name: "taking a photo (adds to the others)",
    old: "      setMediaUris([photo.uri]);\n      setConfirmMedia(true);",
    new: `      // One more photo of the post (the first ones stay), up to the limit
      setMediaUris((previous) => [...previous, photo.uri].slice(0, sessionMax));
      setAddingMore(false);
      setConfirmMedia(true);`,
  },
  {
    name: "the gallery: only what is left to reach the limit",
    old: "        selectionLimit: imagesSelectionLimit,",
    new: '        selectionLimit: mode === "video" ? 0 : Math.max(sessionMax - mediaUris.length, 1),',
  },
  {
    name: "the gallery: adds to the photos already taken",
    old: "        const uris = result.assets.map((asset) => asset.uri);\n        setMediaUris(uris);\n        setConfirmMedia(true);",
    new: `        const uris = result.assets.map((asset) => asset.uri);
        // Photos are added to the ones already taken (up to the limit); a video replaces
        setMediaUris(
          mode === "photo"
            ? [...mediaUris, ...uris].slice(0, sessionMax)
            : uris,
        );
        setAddingMore(false);
        setConfirmMedia(true);`,
  },
  {
    name: "the review shows only when not adding more",
    old: "  if (mediaUris?.length > 0) {",
    new: "  if (mediaUris?.length > 0 && !addingMore) {",
  },
  {
    name: "the swiper follows the photo that is showing",
    old: "          <Swiper\n            loop={false}",
    new: "          <Swiper\n            key={mediaUris.length}\n            onIndexChanged={setCurrentIndex}\n            loop={false}",
  },
  {
    name: "the counter and the remove button",
    old: "          </Swiper>\n\n          {confirmMedia && (",
    new: `          </Swiper>

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

          {confirmMedia && (`,
  },
  {
    name: "the Add picture button",
    old: "<Text style={styles.bottomText}>Retake</Text>\n                </TouchableOpacity>\n",
    new: `<Text style={styles.bottomText}>Retake</Text>
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
`,
  },
  {
    name: "the camera: X goes back to the photos, and the counter",
    old: "<TouchableOpacity style={styles.closeButton} onPress={onClose}>",
    new: "<TouchableOpacity\n                style={styles.closeButton}\n                onPress={addingMore ? () => setAddingMore(false) : onClose}\n              >",
  },
  {
    name: "the counter in the camera",
    old: "            <Text style={styles.timerText}>{formatTime(recordedTime)}</Text>\n          )}",
    new: `            <Text style={styles.timerText}>{formatTime(recordedTime)}</Text>
          )}

          {mode === "photo" && mediaUris.length > 0 && (
            <Text style={styles.countText}>
              {mediaUris.length}/{sessionMax} photos
            </Text>
          )}`,
  },
  {
    name: "the styles",
    old: "const styles = StyleSheet.create({",
    new: `const styles = StyleSheet.create({
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
  },`,
  },
];

// every place must be found exactly once, or nothing is changed
const problems = [];
for (const edit of edits) {
  const count = src.split(edit.old).length - 1;
  if (count !== 1) problems.push(`  - ${edit.name}: found ${count} times (it must be 1)`);
}
if (problems.length) {
  console.error("Nothing was changed. These places were not found as expected:\n" + problems.join("\n"));
  console.error("\nSend me the lines of those places and I will adjust the script.");
  process.exit(1);
}

for (const edit of edits) src = src.replace(edit.old, () => edit.new);

fs.writeFileSync(file + ".bak", raw);
fs.writeFileSync(file, crlf ? src.replace(/\n/g, "\r\n") : src);
console.log(`Done: ${edits.length} changes in ${file} (a copy of the old one: ${file}.bak)`);
