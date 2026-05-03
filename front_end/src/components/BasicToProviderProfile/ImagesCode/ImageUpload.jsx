import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import classes from "./ImageUpload.module.css";
import axios from "axios";
import ImageItem from "./ImageItem";
import { FaTimes } from "react-icons/fa";

/**
 * ImageUpload Component
 * ---------------------
 * קומפוננטה לניהול גלריית העסק (עד 5 תמונות).
 * * תכונות עיקריות:
 * - טעינת תמונות קיימות מה-Backend לפי הרשאות (Role).
 * - העלאת תמונות חדשות בפורמט FormData עם וולידציה (סוג קובץ וגודל).
 * - ניהול תצוגה מקדימה לפני שמירה.
 * - אינטגרציה עם ImageItem להצגת כל תמונה בנפרד.
 */
export default function ImageUpload({ role, provider, ok }) {
  const [images, setImages] = useState([]); //images that the provider selesct
  const [uploading, setUploading] = useState(false);
  const [existingImages, setExistingImages] = useState([]); //images from DB
  const [error, setError] = useState(""); // מצב חדש להודעות שגיאה
  const MAX_IMAGES = 5;
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const totalImages = images.length + existingImages.length;

  useEffect(() => {
    // בדיקה בטוחה: האם 'ok' הוא פונקציה?
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
        url = "http://localhost:3030/provider/MyImages";
      } else {
        url = `http://localhost:3030/${role?.toLowerCase()}/ProviderImages/${provider?.id}`;
      }
      const response = await axios.get(url, { withCredentials: true });
      if (response.data.success) {
        setExistingImages(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  useEffect(() => {
    if (provider) fetchAllImages();
  }, [provider?.id, role]);

  const submitGallery = async () => {
    if (images.length === 0) return;
    setUploading(true);
    const loadingToast = toast.loading("Uploading images...");
    try {
      const formData = new FormData();
      images.forEach((img) => formData.append("images", img));
      const response = await axios.post(
        "http://localhost:3030/provider/upload-gallery",
        formData,
        { withCredentials: true },
      );
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
  };

  const handleSetMain = async (path) => {
    const loadingToast = toast.loading("Updating main image...");
    try {
      const response = await axios.post(
        "http://localhost:3030/provider/mainImage",
        { imagePath: path },
        { withCredentials: true },
      );
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
      const response = await axios.delete(
        `http://localhost:3030/provider/deleteImage/${path}`,
        { withCredentials: true },
      );
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
        {existingImages.map((img, index) => (
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
