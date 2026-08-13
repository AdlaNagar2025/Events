import React from "react";
import classes from "./ImageUpload.module.css";
import { FaStar, FaRegStar, FaTimes } from "react-icons/fa";
/**
 * ImageItem Component
 * -------------------
 * פריט תצוגה בודד עבור גלריית התמונות.
 *
 * @param {Object} props
 * @param {Object|File} props.img - אובייקט תמונה מה-DB או קובץ File מקומי
 * @param {boolean} props.isExisting - האם התמונה כבר קיימת בשרת
 * @param {Function} props.onRemove - פונקציית מחיקה
 * @param {Function} props.onSetMain - פונקציה להגדרת תמונה ראשית
 * @param {boolean} props.isMain - האם התמונה מוגדרת כראשית
 * @param {string} props.role - תפקיד המשתמש המחובר
 */
const UPLOADS_BASE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:3030"}/uploads/`;

const ImageItem = ({ img, isExisting, onRemove, onSetMain, isMain, role }) => {
  const isProvider = role === "Chief" || role === "Hall_Owner";
  const imageSrc = isExisting
    ? `${UPLOADS_BASE_URL}${img.image_path}`
    : URL.createObjectURL(img);
  return (
    <div
      className={`${classes.imageWrapper} ${isMain ? classes.mainActive : ""}`}
    >
      <img src={imageSrc} alt="preview" className={classes.previewImg} />

      {isProvider && (
        <div className={classes.overlay}>
          <button
            type="button"
            className={classes.removeBtn}
            onClick={onRemove}
            title={isExisting ? "Delete Image" : "Remove Choice"}
          >
            <FaTimes />
          </button>

          {isExisting && (
            <div
              className={`${classes.starIcon} ${isMain ? classes.starActive : ""}`}
              onClick={() => onSetMain(img.image_path)}
              title={isMain ? "Main Image" : "Set as Main"}
            >
              {isMain ? <FaStar /> : <FaRegStar />}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageItem;
