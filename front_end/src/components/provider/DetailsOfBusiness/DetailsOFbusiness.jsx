import React, { useState, useEffect } from "react";
import BusinessAccount from "../BusinessAccount/BusinessAccount";
import ImageUpload from "../ImageGallery/ImageUpload";
import Calendar from "../Calander/Calendar";
import classes from "./DetailsOFbusiness.module.css";
import { FaTimes, FaUserAlt, FaImages, FaCalendarAlt } from "react-icons/fa";
import API from "../../../services/api";
import toast from "react-hot-toast";

function DetailsOFbusiness({ user }) {
  const [activeTab, setActiveTab] = useState(1);
  const [isDisable, setIsDisable] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const [currentRating, setCurrentRating] = useState("");
  const [check, setCheck] = useState(false);
  const [isProfileFilled, setIsProfileFilled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const getStatus = async () => {
      try {
        const response = await API.get("/provider/MyBusinessStatusAndRating");
        if (response.data.success) {
          const statusFromServer = response.data.status;
          setCurrentStatus(statusFromServer);
          setCurrentRating(response.data.avgRating);

          if (statusFromServer === "PENDING") {
            setIsDisable(true);
            setActiveTab(1);
          }
        }
      } catch (error) {
        console.error("Failed to fetch status", error);
      }
    };
    getStatus();
  }, []);

  async function handleStatusChange() {
    if (!isProfileFilled) {
      setError(
        "You must fill out and save your business profile details before submitting.",
      );
      setActiveTab(1); // קופץ לטאב 1 כדי שהמשתמש יראה מה חסר
      return;
    }

    if (!check) {
      setError("You must upload at least one image before submitting.");
      setActiveTab(2); // קופץ לטאב 2
      return;
    }

    setError("");
    const tableName = user?.role === "Chief" ? "chiefs" : "halls";
    const id = user?.id;
    const newStatus = "PENDING";

    try {
      const response = await API.post("/provider/approve-business", {
        type: tableName,
        id,
        newStatus,
      });

      toast.success(response.data.message);
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

      <div className={classes.tabsHeader}>
        <button
          className={`${classes.tabBtn} ${activeTab === 1 ? classes.activeTab : ""}`}
          onClick={() => setActiveTab(1)}
        >
          <FaUserAlt /> 1. Business Profile
        </button>
        <button
          className={`${classes.tabBtn} ${activeTab === 2 ? classes.activeTab : ""}`}
          onClick={() => setActiveTab(2)}
        >
          <FaImages /> 2. Gallery
        </button>
        <button
          className={`${classes.tabBtn} ${activeTab === 3 ? classes.activeTab : ""}`}
          onClick={() => setActiveTab(3)}
        >
          <FaCalendarAlt /> 3. Availability
        </button>
      </div>

      <div className={classes.tabContent}>
        {activeTab === 1 && (
          <BusinessAccount
            user={user}
            isDisable={isDisable}
            setIsProfileFilled={setIsProfileFilled}
          />
        )}

        {activeTab === 2 && (
          <ImageUpload
            role={user?.role}
            provider={user}
            ok={setCheck}
            isDisable={isDisable}
          />
        )}

        {activeTab === 3 && (
          <Calendar role={user?.role} user={user} isDisable={isDisable} />
        )}
      </div>

      {currentStatus !== "APPROVED" && (
        <button
          onClick={handleStatusChange}
          disabled={isDisable}
          className={classes.submitBtn}
        >
          {currentStatus === "PENDING" && "⏳ Waiting for Approval..."}
          {(currentStatus === "DRAFT" ||
            currentStatus === "DENY" ||
            !currentStatus) &&
            "Submit To Admin"}
        </button>
      )}

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
