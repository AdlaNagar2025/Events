import React, { useState, useEffect } from "react";
import axios from "axios";
import classes from "./bookEvent.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import EventData from "./EventData";

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

  const [eventLocation, setEventLocation] = useState("");
  const [notesToHall, setNotesToHall] = useState("");
  const [noteToChef, setNoteToChef] = useState({}); // תיקון: אובייקט ריק חלק {} במקום מערך [{}]

  const handleChefNoteChange = (chefId, text) => {
    setNoteToChef((prev) => ({
      ...prev,
      [chefId]: text,
    }));
  };

  useEffect(() => {
    if (!location.state) {
      navigate("/customer/find-vendor");
      return;
    }

    async function fetchProvidersData() {
      setLoading(true);
      try {
        if (hallId) {
          const hallRes = await axios.get(
            `http://localhost:3030/customer/CardData/${hallId}`,
            { withCredentials: true },
          );
          if (hallRes.data.success) setHallData(hallRes.data.data);
        }

        if (selectedChiefsId.length > 0) {
          const tempChiefs = [];
          for (const id of selectedChiefsId) {
            try {
              const response = await axios.get(
                `http://localhost:3030/customer/Profile/${id}`,
                { withCredentials: true },
              );
              tempChiefs.push(response.data.data);
            } catch (err) {
              console.error(`Failed to fetch chef ${id}:`, err);
            }
          }
          setChiefsData(tempChiefs);
        }
      } catch (error) {
        console.error("Error fetching providers details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProvidersData();
  }, [hallId, selectedChiefsId, location.state, navigate]);

  async function saveData() {
    if (!hallId && !eventLocation.trim()) {
      alert("Please select a location for the chefs!");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3030/customer/eventData",
        {
          dataToEvent,
          hallId,
          selectedChiefsId,
          location: hallId ? hallData?.hall_name : eventLocation,
          notesToHall,
          noteToChef,
        },
        { withCredentials: true },
      );
      if (response.data.success) {
        alert("Event Booked Successfully!");
        navigate("/customer/my-booking");
      }
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to book event.");
    }
  }

  if (loading)
    return <div className={classes.loader}>Loading Event Details...</div>;

  const shouldShowButton = hallId ? !!hallData : !!eventLocation;

  return (
    <div className={classes.page}>
      <div className={classes.pageHeader}>
        <h1>Book Your Event</h1>
        <p>Review details and confirm your booking</p>
      </div>

      <EventData
        dataToEvent={dataToEvent}
        hallData={hallData}
        chiefsData={chiefsData}
        eventLocation={eventLocation}
        setEventLocation={setEventLocation}
        notesToHall={notesToHall}
        setNotesToHall={setNotesToHall}
        noteToChef={noteToChef}
        setNoteToChef={setNoteToChef}
        hallId={hallId}
        handleChefNoteChange={handleChefNoteChange}
      />

      {/* תיקון הרינדור של התנאי הלוגי */}
      {shouldShowButton && (
        <button className={classes.confirmBtn} onClick={saveData}>
          Confirm & Book Now
        </button>
      )}
    </div>
  );
}
