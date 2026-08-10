import React, { useEffect, useState } from "react";
import API from "../../services/api";
import classes from "../customer/review.module.css";
import { Rating } from "@mui/material";
import toast from "react-hot-toast";

export default function ReviewSection({ event, onClose }) {
  const providers = [
    ...(event.hall_id ? [{ id: event.hall_id, name: event.hall_name }] : []),
    ...(event.chiefs ? event.chiefs.map((c) => ({
      id: c.chief_id || c.id,
      name: c.chief_name || c.name,
    })) : []),
  ];

  const [selectedProviderId, setSelectedProviderId] = useState(
    providers[0]?.id || "",
  );
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedProviderId || !event.event_id) return;

    const fetchReviewsEvent = async () => {
      try {
        const response = await API.post(
          `/customer/EventComments/${event.event_id}`,
          { providerId: selectedProviderId },
        );

        if (response.data && response.data.length > 0) {
          setRating(response.data[0].rating || 0);
          setComment(response.data[0].comment || "");
        } else {
          // אם אין ביקורת קודמת, נאפס את השדות לטופס נקי
          setRating(0);
          setComment("");
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };

    fetchReviewsEvent();
  }, [selectedProviderId, event.event_id]);

  // 4. שליחת הטופס לשרת
  const handleSubmit = async (e) => {
    e.preventDefault(); // מניעת רענון עמוד

    if (!selectedProviderId) {
      toast.error("Please select a provider to rate.");
      return;
    }
    if (rating === 0) {
      toast.error("Please select a rating star.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalReviewData = {
        rating,
        comment,
        eventId: event.event_id,
        providerId: selectedProviderId,
      };

      const response = await API.post(
        "/customer/ReviewProvider",
        finalReviewData,
      );

      if (response.data.success || response.data) {
        toast.success("Thank you! Your review has been submitted successfully. ✨");
        onClose(); // סגירת המודאל החלון
      }
    } catch (err) {
      console.error("Review failed", err);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={classes.modalBackdrop}>
      <div className={classes.reviewModal}>
        {/* כפתור סגירה X */}
        <button className={classes.closeModalBtn} onClick={onClose}>
          &times;
        </button>

        <h3>⭐ Share Your Experience</h3>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Your feedback helps build a better community for everyone.
        </p>

        <form onSubmit={handleSubmit} className={classes.formContainer}>
          {/* 1. בחירת הספק אותו רוצים לדרג */}
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Select Provider to Rate:
            </label>
            <select
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(Number(e.target.value))}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. בחירת כוכבי הדירוג */}
          <div
            style={{
              marginBottom: "15px",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            <label style={{ fontWeight: "bold" }}>Rating:</label>
            <Rating
              value={rating}
              precision={0.5}
              onChange={(event, newValue) => setRating(newValue)}
              size="large"
            />
          </div>

          {/* 3. כתיבת תגובה */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Review Comment (Optional):
            </label>
            <textarea
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                height: "100px",
                resize: "vertical",
              }}
              placeholder="Tell us about the service, food, atmosphere..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* כפתור שליחה דינמי */}
          <button
            type="submit"
            style={{
              backgroundColor: "#2ecc71",
              color: "white",
              padding: "10px 15px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
              fontWeight: "bold",
              fontSize: "16px",
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
