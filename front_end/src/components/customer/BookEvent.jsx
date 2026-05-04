import React, { useState, useEffect } from "react";
import axios from "axios";
import classes from "./bookEvent.module.css";
import ServiceCard from "../BasicToProviderProfile/ServiceCard";
import { useLocation } from "react-router-dom";

export default function BookEvent({ user, provider }) {
  const location = useLocation();
  // שימוש ב-Optional Chaining כדי למנוע קריסה
  const dataToEvent = location.state?.dataToEvent;
  const selectedProviderIds = location.state?.selectedProviderIds;
  // בדיקה אם המידע קיים, ואם לא - הצגת הודעה או הפניה חזרה

  async function saveData() {
    try {
      const response = await axios.post(
        "http://localhost:3030/customer/eventData",
        { dataToEvent, selectedProviderIds },
        { withCredentials: true },
      );
      if (response.data.success) {
        alert("DONE!!!");
      }
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className={classes.EventDetails}>
      <h2>Event Details: </h2>
      <strong>Date : </strong>
      <p>{dataToEvent.date}</p>
      <strong>StartTime : </strong>
      <p>{dataToEvent.startTime}</p>
      <strong>EndTime : </strong>
      <p>{dataToEvent.endTime}</p>
      <strong>Capacity:</strong>
      <p>{dataToEvent.capacity}</p>
      <strong>Location:</strong>
      <p>{dataToEvent.city}</p>

      <strong>Selected Provider</strong>
      <p>{selectedProviderIds}</p>

      <button onClick={saveData}>Confirm</button>
    </div>
  );
}
