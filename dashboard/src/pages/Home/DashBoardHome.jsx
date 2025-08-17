import React, { useState, useRef } from "react";
import { usePicturesContext } from "../../contexts/PicturesContext";

const DashBoardHome = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [savedImageUrl, setSavedImageUrl] = useState(null);
  const { savePhotoInBucket, getPhotoInBucket } = usePicturesContext();
  const canvasRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    // Create a new FileReader instance
    const reader = new FileReader();
    reader.onload = (event) => {
      // Create a new Image object
      const img = new Image();
      img.onload = () => {
        // Create a canvas element
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Define aspect ratio
        const aspectRatio = 4 / 3;

        // Calculate height and width based on aspect ratio
        let width, height;
        if (img.width / img.height > aspectRatio) {
          // If image is wider, calculate height based on aspect ratio
          height = Math.min(100, img.height); // Set max height to 100 pixels (adjust as needed)
          width = height * aspectRatio;
        } else {
          // If image is taller, calculate width based on aspect ratio
          width = Math.min(100, img.width); // Set max width to 100 pixels (adjust as needed)
          height = width / aspectRatio;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw the selected image on the canvas with desired dimensions
        ctx.drawImage(img, 0, 0, width, height);

        // Set the selected file
        setSelectedFile(file);
      };

      // Set the src of the Image object to the data URL of the file
      img.src = event.target.result;
    };

    // Read the file as a data URL
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (selectedFile) {
      try {
        // Create a canvas element
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Set canvas dimensions
        canvas.width = 100; // Set your desired width
        canvas.height = 100; // Set your desired height

        // Draw the selected image on the canvas with desired dimensions
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Convert canvas content to a blob
          canvas.toBlob(async (blob) => {
            // Create a new File object from the blob
            const formattedFile = new File([blob], selectedFile.name, {
              type: "image/jpeg", // Set the desired image format
            });
            // Save the formatted photo in the bucket
            const filename = formattedFile.name;
            await savePhotoInBucket(filename, formattedFile);

            // Retrieve the saved photo from the bucket
            const imageURL = await getPhotoInBucket(filename);

            // Set the URL of the saved photo
            setSavedImageUrl(imageURL);
          }, "image/jpeg");
        };
        img.src = URL.createObjectURL(selectedFile);
      } catch (error) {
        console.error("Error uploading photo:", error);
      }
    }
  };

  return (
    <div style={{ marginLeft: "16rem" }}>
      <h1>Dashboard Home</h1>
      {/* Button to choose a file */}
      <input type="file" onChange={handleFileChange} />
      {/* Button to upload the chosen file */}
      <button onClick={handleUpload}>Upload Photo</button>
      {/* Display the selected image */}
      {selectedFile && (
        <div>
          <h2>Selected Image:</h2>
          <img
            src={URL.createObjectURL(selectedFile)}
            alt="Selected"
            style={{
              width: "90px",
              height: "90px",
              margin: 0,
              padding: 0,
              float: "left",
              marginLeft: "20px",
              borderRadius: "70%",
              objectFit: "contain",
            }}
          />
        </div>
      )}
      {/* Display the saved image */}
      {savedImageUrl && (
        <div>
          <h2>Saved Image:</h2>
          <img src={savedImageUrl} alt="Saved" />
        </div>
      )}
      {/* Canvas for formatting the image */}
      <canvas
        ref={canvasRef}
        style={{ width: 0, height: 0, display: "block" }}
      ></canvas>
    </div>
  );
};

export default DashBoardHome;
