import { useState } from "react";
import axios from "axios";
import classes from "../customer/review.module.css";

export default function ReportSection({ event, onClose }) {
  const providers = [
    ...(event.hall_id
      ? [{ id: event.hall_id, name: event.hall_name, type: "BUSINESS" }]
      : []),
    ...(event.chiefs ? event.chiefs.map((c) => ({
      id: c.chief_id || c.id,
      name: c.chief_name || c.name,
      type: "BUSINESS",
    })) : []),
  ];

  const [report, setReport] = useState({
    reported_id: providers[0]?.id || "", // ברירת מחדל: הספק הראשון ברשימה
    target_type: "BUSINESS",
    target_id: null, // יישאר null כי הדיווח הוא על העסק ישירות מהאירוע
    reason: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);

  async function writeReport(e) {
    e.preventDefault(); // מניעת רענון של העמוד

    if (!report.reason.trim()) {
      alert("Please provide a reason for the report.");
      return;
    }

    try {
      setLoading(false);
      const response = await axios.post(
        "http://localhost:3030/customer/writeReport",
        report,
        { withCredentials: true }, 
      );

      if (response.data.success) {
        alert(
          "Thank you. Your report has been submitted to the admin for review. 🚩",
        );
        onClose(); 
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      alert(
        error.response?.data?.msg ||
          "Failed to submit report. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={classes.modalBackdrop}>
      <div className={classes.reviewModal}>
        <button className={classes.closeModalBtn} onClick={onClose}>
          &times;
        </button>

        <h3>🚩 Report an Issue</h3>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Please select the provider and describe the problem you experienced.
        </p>

        <form onSubmit={writeReport} className={classes.formContainer}>
          {/* 1. בחירת הספק עליו מתלוננים */}
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Select Provider:
            </label>
            <select
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
              value={report.reported_id}
              onChange={(e) =>
                setReport({ ...report, reported_id: Number(e.target.value) })
              }
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. הזנת סיבת התלונה */}
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Reason:
            </label>
            <input
              type="text"
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
              placeholder="e.g., Provider did not show up, Bad behavior..."
              value={report.reason}
              onChange={(e) => setReport({ ...report, reason: e.target.value })}
            />
          </div>

          {/* 3. פירוט חופשי */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Description (Optional):
            </label>
            <textarea
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                height: "100px",
              }}
              placeholder="Provide more details about what happened..."
              value={report.description}
              onChange={(e) =>
                setReport({ ...report, description: e.target.value })
              }
            ></textarea>
          </div>

          {/* כפתור שליחה */}
          <button
            type="submit"
            style={{
              backgroundColor: "#c0392b",
              color: "white",
              padding: "10px 15px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
              fontWeight: "bold",
            }}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
