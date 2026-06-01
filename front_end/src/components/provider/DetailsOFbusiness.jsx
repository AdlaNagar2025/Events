import React, { useState, useEffect } from "react";
import BusinessAccount from "../BasicToProviderProfile/BusinessAccount";
import ImageUpload from "../BasicToProviderProfile/ImagesCode/ImageUpload";
import Calendar from "../BasicToProviderProfile/Calendar/Calendar";
import classes from "./DetailsOFbusiness.module.css";
import { FaTimes } from "react-icons/fa";
import axios from "axios";

function DetailsOFbusiness({ user }) {
  const [isDisable, setIsDisable] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const [currentRating, setCurrentRating] = useState("");
  const [check, setCheck] = useState(false); // בדיקת תמונות
  const [isProfileFilled, setIsProfileFilled] = useState(false); // ✨ בדיקת מילוי שדות העסק
  const [error, setError] = useState("");

  useEffect(() => {
    const getStatus = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3030/provider/MyBusinessStatusAndRating",
          { withCredentials: true },
        );
        if (response.data.success) {
          const statusFromServer = response.data.status;
          setCurrentStatus(statusFromServer);
          setCurrentRating(response.data.avgRating);

          if (statusFromServer === "PENDING") {
            setIsDisable(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch status", error);
      }
    };
    getStatus();
  }, []);

  async function handleStatusChange() {
    try {
      // 1. בדיקה ראשונה: האם מולאו שדות החובה של פרופיל העסק ונשמרו?
      if (!isProfileFilled) {
        setError(
          "You must fill out and save your business profile details before submitting.",
        );
        return;
      }

      // 2. בדיקה שנייה: האם הועלתה לפחות תמונה אחת?
      if (!check) {
        setError("You must upload at least one image before submitting.");
        return;
      }

      setError("");
      const tableName = user?.role === "Chief" ? "chiefs" : "halls";
      const id = user?.id;
      const newStatus = "PENDING";

      const response = await axios.post(
        "http://localhost:3030/provider/approve-business",
        { type: tableName, id, newStatus },
        { withCredentials: true },
      );

      alert(response.data.message);
      setCurrentStatus("PENDING");
      setIsDisable(true);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }

  return (
    <div
      className={`${classes.mainContainer} ${isDisable ? classes.disabledArea : ""}`}
    >
      <header className={classes.header}>
        <h1>Business Setup</h1>
        <p>
          Status:{" "}
          <strong className={classes[currentStatus]}>{currentStatus}</strong>
        </p>
        {currentRating > 0 && <p>{currentRating} ⭐</p>}
      </header>

      {currentStatus === "PENDING" && (
        <div className={classes.infoMessage}>
          ℹ️ Your profile is currently under review by our admin team. Changes
          are disabled during this time.
        </div>
      )}

      <section className={classes.stepCard}>
        <div className={classes.stepNumber}>1</div>
        {/* ✨ מעבירים את ה-Setter כדי ש-BusinessAccount יעדכן אותו */}
        <BusinessAccount
          user={user}
          isDisable={isDisable}
          setIsProfileFilled={setIsProfileFilled}
        />
      </section>

      <div className={classes.divider} />

      <section className={classes.stepCard}>
        <div className={classes.stepNumber}>2</div>
        <ImageUpload
          role={user?.role}
          provider={user}
          ok={setCheck}
          isDisable={isDisable}
        />
      </section>

      <div className={classes.divider} />

      <section className={classes.stepCard}>
        <div className={classes.stepNumber}>3</div>
        <Calendar role={user?.role} user={user} isDisable={isDisable} />
      </section>

      <button
        onClick={handleStatusChange}
        disabled={isDisable}
        className={classes.submitBtn}
      >
        {currentStatus === "PENDING" && "⏳ Waiting for Approval..."}
        {currentStatus === "APPROVED" && "✅ Profile Approved"}
        {(currentStatus === "DRAFT" ||
          currentStatus === "DENY" ||
          !currentStatus) &&
          "Submit To Admin"}
      </button>

      {error && (
        <div className={classes.errorMessage}>
          <span>{error}</span>
          <button onClick={() => setError("")} className={classes.closeError}>
            <FaTimes />
          </button>
        </div>
      )}
    </div>
  );
}

export default DetailsOFbusiness;
