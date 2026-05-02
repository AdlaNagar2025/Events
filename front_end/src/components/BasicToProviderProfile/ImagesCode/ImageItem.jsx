import React from "react";
import classes from "./ImageUpload.module.css";
import { FaStar, FaRegStar, FaTimes } from "react-icons/fa";
/**
 * ImageItem Component
 * -------------------
 * פריט תצוגה בודד עבור גלריית התמונות.
 * * תכונות עיקריות:
 * - מציג תצוגה מקדימה (Preview) לתמונות מקומיות או תמונות מהשרת.
 * - כפתור מחיקה (X).
 * - כפתור כוכב (Main) להגדרת התמונה כתמונת פרופיל עסקית (זמין רק לתמונות קיימות).
 * - מסגרת זהב בולטת במידה והתמונה מוגדרת כראשית.
 */
const ImageItem = ({ img, isExisting, onRemove, onSetMain, isMain }) => {
  return (
    <div
      className={`${classes.imageWrapper} ${isMain ? classes.mainActive : ""}`}
    >
      <img
        src={
          isExisting
            ? `http://localhost:3030/uploads/${img.image_path}`
            : URL.createObjectURL(img)
        }
        alt="preview"
        className={classes.previewImg}
      />

      <div className={classes.overlay}>
        <button
          type="button"
          className={classes.removeBtn}
          onClick={onRemove}
          title="Remove Image"
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
    </div>
  );
};

export default ImageItem;
