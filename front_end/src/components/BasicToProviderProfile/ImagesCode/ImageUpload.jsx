import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import classes from "./ImageUpload.module.css";
import API from "../../../services/api";
import ImageItem from "./ImageItem";
import { FaTimes } from "react-icons/fa";

/**
 * ImageUpload Component
 * ---------------------
 * קומפוננטה לניהול גלריית העסק (עד 5 תמונות).
 *
 * @param {Object} props
 * @param {string} props.role - תפקיד המשתמש (Chief / Hall_Owner / Admin / Customer)
 * @param {Object} props.provider - פרטי הספק (בעת צפייה של אדמין/לקוח)
 * @param {Function} props.ok - Callback לעדכון טופס האב האם יש לפחות תמונה אחת
 */
export default function ImageUpload({ role, provider, ok }) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [error, setError] = useState("");
  const MAX_IMAGES = 5;
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const validExisting = Array.isArray(existingImages) ? existingImages : [];

  const totalImages = images.length + existingImages.length;

  useEffect(() => {
    if (typeof ok === "function") {
      const isValid = existingImages && existingImages.length > 0;
      ok(isValid);
    }
  }, [existingImages.length, ok]);

  const fetchAllImages = async () => {
    if (!role) return;
    try {
      let url;
      if (role === "Chief" || role === "Hall_Owner") {
        url = "/provider/MyImages";
      } else {
        url = `/${role?.toLowerCase()}/ProviderImages/${provider?.id}`;
      }
      const response = await API.get(url);
      if (response.data?.success && Array.isArray(response.data.data)) {
        setExistingImages(response.data.data);
      } else {
        setExistingImages([]);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
      setExistingImages([]);
    }
  };

  useEffect(() => {
    if (provider) fetchAllImages();
  }, [provider?.id, role]);

  const submitGallery = async () => {
    console.log(images);
    if (images.length === 0) return;
    setUploading(true);
    const loadingToast = toast.loading("Uploading images...");
    try {
      const formData = new FormData();
      images.forEach((img) => formData.append("images", img));
      console.log(formData);
      const response = await API.post("/provider/upload-gallery", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data.success) {
        toast.success(response.data.message || "Gallery updated! ✨", {
          id: loadingToast,
        });
        setImages([]);
        fetchAllImages();
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Upload failed.";
      toast.error(msg, { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleChangeImage = (e) => {
    setError("");
    const selectedFiles = Array.from(e.target.files);

    if (totalImages + selectedFiles.length > MAX_IMAGES) {
      setError(`You can only upload up to ${MAX_IMAGES} images in total.`);
      return;
    }

    // Check file size for each selected file
    const largeFiles = selectedFiles.filter(
      (file) => file.size > MAX_FILE_SIZE,
    );
    if (largeFiles.length > 0) {
      setError(
        "Some files were skipped because they exceed the 2MB size limit.",
      );
    }

    const validFiles = selectedFiles.filter(
      (file) => file.type.startsWith("image/") && file.size <= MAX_FILE_SIZE,
    );

    setImages((prev) => [...prev, ...validFiles]);
    e.target.value = "";
  };

  const handleSetMain = async (path) => {
    const loadingToast = toast.loading("Updating main image...");
    try {
      const response = await API.post("/provider/mainImage", {
        imagePath: path,
      });
      if (response.data.success) {
        toast.success("Main image updated!", { id: loadingToast });
        fetchAllImages();
      }
    } catch (error) {
      toast.error("Failed to update main image.", { id: loadingToast });
    }
  };
  const removeExistingImage = async (path) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;

    const loadingToast = toast.loading("Deleting image...");
    try {
      const response = await API.delete(`/provider/deleteImage/${path}`);
      if (response.data.success) {
        toast.success("Image deleted.", { id: loadingToast });
        fetchAllImages();
      }
    } catch (error) {
      toast.error("Delete failed.", { id: loadingToast });
    }
  };

  const isGalleryValid = totalImages > 0;
  return (
    <div className={classes.imagediv}>
      <div className={classes.header}>
        <h3>Gallery</h3>
        <span
          className={
            totalImages >= MAX_IMAGES ? classes.limitReached : classes.counter
          }
        >
          {totalImages} / {MAX_IMAGES}
        </span>
      </div>
      {/* Error Message Display */}
      {error && (
        <div className={classes.errorMessage}>
          <span>{error}</span>
          <button onClick={() => setError("")} className={classes.closeError}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* Requirement Warning */}
      {!isGalleryValid && !uploading && (
        <div className={classes.warningMessage}>
          Note: Your business profile must contain at least one image.
        </div>
      )}

      <div className={classes.previewContainer}>
        {validExisting.map((img, index) => (
          <ImageItem
            key={img.image_id || index}
            img={img}
            isExisting={true}
            isMain={img.is_main === 1}
            onRemove={() => removeExistingImage(img.image_path)}
            onSetMain={handleSetMain}
            role={role}
          />
        ))}

        {images.map((file, index) => (
          <ImageItem
            key={`new-${index}`}
            img={file}
            isExisting={false}
            onRemove={() =>
              setImages((prev) => prev.filter((_, i) => i !== index))
            }
            role={role}
          />
        ))}
      </div>

      {(role === "Hall_Owner" || role === "Chief") && (
        <div className={classes.controls}>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleChangeImage}
            disabled={uploading || totalImages >= MAX_IMAGES}
          />
          <button
            onClick={submitGallery}
            disabled={uploading || images.length === 0}
          >
            {uploading ? "Uploading..." : "Save Gallery"}
          </button>
        </div>
      )}
    </div>
  );
}
