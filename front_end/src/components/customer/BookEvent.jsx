import React, { useState, useEffect } from "react";
import axios from "axios";
import classes from "./bookEvent.module.css";
import ServiceCard from "../BasicToProviderProfile/ServiceCard";
import { useLocation } from "react-router-dom";

export default function BookEvent({ user, provider }) {
  const location = useLocation();

  // שימוש ב-Optional Chaining כדי למנוע קריסה
  const data = location.state?.dataToEvent;

  // בדיקה אם המידע קיים, ואם לא - הצגת הודעה או הפניה חזרה
  if (!data) {
    return <p>Missing event details. Please go back and search again.</p>;
  }

  // function saveData(){
  //   const response=await axios.post("http://localhost:3030/customer/eventData" ,data , {withCredentials:true} )
  // }

  return (
    <div className={classes.EventDetails}>
      <h2>Event Details: </h2>
      <strong>Date : </strong>
      <p>{data.date}</p>
      <strong>StartTime : </strong>
      <p>{data.startTime}</p>
      <strong>EndTime : </strong>
      <p>{data.endTime}</p>
      <strong>Capacity:</strong>
      <p>{data.capacity}</p>
      <strong>Location:</strong>
      <p>{data.city}</p>

      <strong>Selected Provider</strong>

      {/* <button onClick={saveData}>Confirm</button> */}
    </div>
  );
}
