import React from "react";
import { useState } from "react";
import axios from "axios";
import classes from "./commentReportModal.module.css";

export default function CommentReportModal({ review, onClose }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please enter a reason for the report.");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        "http://localhost:3030/provider/writeReport",
        {
          reported_id: review.userId, // ה-ID של המשתמש שכתב את התגובה הפוגענית
          target_type: "COMMENT", // סוג יעד קבוע
          target_id: review.reviewId, // ה-ID של התגובה עצמה במסד הנתונים
          reason: reason,
          description: description,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        alert("Comment reported successfully to the administrator. 🚩");
        onClose();
      }
    } catch (error) {
      console.error("Error reporting comment:", error);
      alert("Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.modalBackdrop}>
      <div className={classes.reviewModal}>
        <button className={classes.closeModalBtn} onClick={onClose}>
          &times;
        </button>
        <h3>Report Comment</h3>
        <p style={{ fontSize: "14px", color: "#555" }}>
          Reporting comment left by <strong>{review.clientName}</strong>:
        </p>
        <blockquote
          style={{
            background: "#f1f1f1",
            padding: "10px",
            borderRadius: "4px",
            fontStyle: "italic",
          }}
        >
          "{review.comment}"
        </blockquote>

        <form onSubmit={handleReportSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              Reason:
            </label>
            <input
              type="text"
              placeholder="e.g., Offensive language, Fake review, Spam..."
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              Details:
            </label>
            <textarea
              placeholder="Explain why this comment should be reviewed or removed..."
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                height: "8px0px",
              }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: "#c0392b",
              color: "white",
              border: "none",
              padding: "10px",
              width: "100%",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {loading ? "Submitting..." : "Send Report to Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
