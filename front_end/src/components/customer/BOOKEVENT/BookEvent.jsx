import React, { useState, useEffect } from "react";
import axios from "axios";
import classes from "./bookEvent.module.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function BookEvent({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  // חילוץ הנתונים מה-state (עכשיו מגיעים רק IDs)
  const {
    dataToEvent = {},
    hallId = null,
    selectedChiefsId = [],
  } = location.state || {};

  const [hallData, setHallData] = useState(null);
  const [chiefsData, setChiefsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // הגנה: אם אין נתוני חיפוש בסיסיים, תחזור אחורה
    if (!location.state) {
      navigate("/findVendor");
      return;
    }

    async function fetchProvidersData() {
      setLoading(true);
      try {
        // 1. משיכת נתוני אולם (אם נבחר)
        if (hallId) {
          const hallRes = await axios.get(
            `http://localhost:3030/customer/CardData/${hallId}`,
            { withCredentials: true },
          );
          if (hallRes.data.success) setHallData(hallRes.data.data);
        }

        // 2. משיכת נתוני שפים (אם נבחרו)
        // הערה: כאן אפשר לעשות לופ של בקשות או לבנות נתיב ב-Backend שמקבל מערך IDs
 if (selectedChiefsId.length > 0) {
  const tempChiefs = [];

  for (const id of selectedChiefsId) {
    try {
      const response = await axios.get(`http://localhost:3030/customer/Profile/${id}`, {
        withCredentials: true,
      });
      
      console.log("Chef Data:", response.data.data);
      tempChiefs.push(response.data.data); // מוסיפים למערך הזמני
    } catch (err) {
      console.error(`Failed to fetch chef ${id}:`, err);
    }
  }
  
  setChiefsData(tempChiefs); // מעדכנים את ה-State פעם אחת בסוף
}
      // const chiefsPromises = selectedChiefsId.map(async(id) =>
        
          // );
          // const chiefsResponses = await Promise.all(chiefsPromises);
          // const filteredChiefs = chiefsResponses.map((r) => r.data.data);
          // setChiefsData((prev)=>[...prev,chiefsPromises.data.data]);
        
      } catch (error) {
        console.error("Error fetching providers details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProvidersData();
  }, [hallId, selectedChiefsId, location.state, navigate]);

  async function saveData() {
    try {
      const response = await axios.post(
        "http://localhost:3030/customer/eventData",
        {
          dataToEvent, // השמות מיושרים: requested_date, start_time...
          hallId,
          selectedChiefsId, // זה כבר מערך של IDs מה-state
        },
        { withCredentials: true },
      );
      if (response.data.success) {
        alert("Event Booked Successfully!");
        navigate("/myBooking"); // או הנתיב שלך לרשימת הזמנות
      }
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to book event.");
    }
  }

  if (loading)
    return <div className={classes.loader}>Loading Event Details...</div>;

  return (
    <div className={classes.EventDetails}>
      <h2>Review Your Booking</h2>

      <div className={classes.infoSection}>
        <p>
          <strong>Date:</strong> {dataToEvent.requested_date}
        </p>
        <p>
          <strong>Start Time:</strong> {dataToEvent.start_time}
        </p>
        <p>
          <strong>End Time:</strong> {dataToEvent.end_time}
        </p>
        <p>
          <strong>Guests:</strong> {dataToEvent.guest_number}
        </p>
      </div>

      <hr />

      <h3>Your Selection</h3>
      <div className={classes.providersList}>
        <p>
          <strong>Venue:</strong>{" "}
          {hallData ? hallData.hall_name : "No venue selected"}
        </p>

        <div className={classes.chiefsBox}>
          <strong>Selected Chefs:</strong>
          {chiefsData.length > 0 ? (
            <ul>
              {chiefsData.map((chief) => (
                <li key={chief.id}>
                  {chief.first_name} {chief.last_name}
                </li>
              ))}
            </ul>
          ) : (
            <p>No chefs selected</p>
          )}
        </div>
      </div>

      <button className={classes.confirmBtn} onClick={saveData}>
        Confirm & Book Now
      </button>
    </div>
  );
}
