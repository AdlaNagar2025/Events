import React, { useState, useEffect } from "react";
import BusinessAccount from "../BasicToProviderProfile/BusinessAccount";
import ImageUpload from "../BasicToProviderProfile/ImagesCode/ImageUpload";
import Calendar from "../BasicToProviderProfile/Calendar";
import classes from "./DetailsOFbusiness.module.css";
import { FaTimes } from "react-icons/fa";
import axios from "axios";

function DetailsOFbusiness({ user }) {
  const [isDisable, setIsDisable] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const [check, setCheck] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const getStatus = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3030/provider/MyBusinessStatus",
          { withCredentials: true },
        );
        if (response.data.success) {
          const status = response.data.status;
          setCurrentStatus(status);
          if (status === "PENDING") {
            setIsDisable(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch status");
      }
    };
    getStatus();
  }, []);

  console.log(user);
  async function handleStatusChange() {
    try {
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
      setIsDisable(true);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }
  return (
    <div
      className={`${classes.mainContainer} ${isDisable ? classes.disabledArea : ""}`}
    >
      <header className={classes.header}>
        <h1>Business Setup</h1>
        <p>
          Status: <strong>{currentStatus || "NOT SUBMITTED"}</strong>
        </p>
      </header>

      <section className={classes.stepCard}>
        <div className={classes.stepNumber}>1</div>
        <BusinessAccount user={user} isDisable={isDisable} />
      </section>

      <div className={classes.divider} />

      <section className={classes.stepCard}>
        <div className={classes.stepNumber}>2</div>
        <ImageUpload
          role={user?.role}
          user={user}
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
        {isDisable ? "Waiting for Approval..." : "Submit To Admin"}
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
