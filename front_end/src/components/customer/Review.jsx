import React, { useEffect } from "react";
import { useState } from "react";
import axios from "axios";
import classes from "./review.module.css";
import { Rating } from "@mui/material";

export default function Review({ provider, eventId }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (!provider?.id || !eventId) return;
    const fetchReviewsEvent = async () => {
      try {
        const response = await axios.post(
          `http://localhost:3030/customer/EventComments/${eventId}`,
          { providerId: provider.id },
          { withCredentials: true },
        );
        console.log("Fetched review data:", response.data);

        if (response.data && response.data.length > 0) {
          setRating(response.data[0].rating || 0);
          setComment(response.data[0].comment || "");
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };

    fetchReviewsEvent();
  }, [provider, eventId]);

  const handleSubmit = async () => {
    if (!provider?.id) return alert("Provider details missing.");
    setIsSubmitting(true);
    try {
      const finalReviewData = {
        rating,
        comment,
        eventId,
        providerId: provider.id,
      };
      const response = await axios.post(
        "http://localhost:3030/customer/ReviewProvider",
        finalReviewData,
        { withCredentials: true },
      );
      if (response.data.success) {
        alert("Review submitted!");
      }
    } catch (err) {
      console.error("Review failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={classes.reviewBox}>
      <p>
        Rate: <strong>{provider.name}</strong>
      </p>
      <Rating
        value={rating}
        precision={0.5}
        onChange={(event, newValue) => setRating(newValue)}
      />
      <textarea
        placeholder="Write a comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows="3"
      />
      <button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Submit Review"}
      </button>
    </div>
  );
}
