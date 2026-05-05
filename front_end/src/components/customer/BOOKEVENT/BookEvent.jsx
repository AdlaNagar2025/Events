import React, { useState, useEffect } from "react";
import axios from "axios";
import classes from "./bookEvent.module.css";
import { useLocation } from "react-router-dom";

export default function BookEvent({ user, provider }) {
  const location = useLocation();
  // שימוש ב-Optional Chaining כדי למנוע קריסהc
  const dataToEvent = location.state?.dataToEvent || {};
  const selectedHall = location.state?.selectedHall;
  const selectedChiefs = location.state?.selectedChiefs || [];
  const [hallData,setHallData]=useState(null)
  // בדיקה אם המידע קיים, ואם לא - הצגת הודעה או הפניה חזרה

useEffect(()=>{
    async function HallData() {
      try {
        const url = `http://localhost:3030/customer/CardData/${selectedHall?.id}`;
        const response = await axios.get(url, { withCredentials: true });
        if (response.data.success) {
          console.log("HALL DATA THAT SELECTED ", response.data.data);
        }
        setHallData(response.data.data);
      } catch (error) {
        console.error("Save failed:", error);
        alert("Something went wrong");
      }
    }
HallData()
},[])




  async function saveData() {  
    const chiefsIds = selectedChiefs.map((c) => c.id);
    try {
      const response = await axios.post(
        "http://localhost:3030/customer/eventData",
        {
          dataToEvent,
          hallId: selectedHall?.id,
          selectedChiefsId: chiefsIds, // עכשיו המשתנה הזה מוגדר
        },
        { withCredentials: true },
      );
      if (response.data.success) {
        alert("DONE!!!");
      }
    } catch (error) {
      console.error("Save failed:", error);
      alert("Something went wrong");
    }
  }

  // הגנה: אם המשתמש הגיע לדף בלי נתונים (למשל רענון דף ישיר)
  if (!location.state) {
    return <p>No event data found. Please go back to search.</p>;
  }
  return (
    <div className={classes.EventDetails}>
      <h2>Event Details: </h2>

      <div className={classes.infoSection}>
        <p>
          <strong>Date:</strong> {dataToEvent.date}
        </p>
        <p>
          <strong>Start Time:</strong> {dataToEvent.startTime}
        </p>
        <p>
          <strong>End Time:</strong> {dataToEvent.endTime}
        </p>
        <p>
          <strong>Capacity:</strong> {dataToEvent.capacity}
        </p>
        <p>
          <strong>Location:</strong> {hallData?.city || dataToEvent.city || "Not specified"}
        </p>
      </div>

      <hr />

      <h3>Selected Providers</h3>

      <p>
        <strong>Hall:</strong>{hallData?.hall_name}
        {selectedHall ? selectedHall.first_name : "None selected"}
      </p>

      <div>
        <strong>Chiefs:</strong>
        {selectedChiefs.length > 0 ? (
          <ul>
            {selectedChiefs.map((s) => (
              <li key={s.id}>{s.first_name}</li> // הוספת return (דרך סוגריים עגולים) ו-Key
            ))}
          </ul>
        ) : (
          <p>No chiefs selected</p>
        )}
      </div>

      <button className={classes.confirmBtn} onClick={saveData}>
        Confirm & Book Now
      </button>
    </div>
  );
}