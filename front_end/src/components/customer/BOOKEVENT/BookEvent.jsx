import React, { useState, useEffect } from "react";
import API from "../../../services/api";
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
          const hallRes = await API.get(`/customer/provider-details/${hallId}`);
          if (hallRes.data.success) setHallData(hallRes.data.data);
        }

        // ✅ מהיר: שליפת כל הספקים במקביל
        if (selectedChiefsId.length > 0) {
          const requests = selectedChiefsId.map((id) =>
            API.get(`/customer/provider-details/${id}`).catch((err) => {
              console.error(`Failed to fetch chef ${id}:`, err);
              return null;
            }),
          );

          const responses = await Promise.all(requests);
          const tempChiefs = responses
            .filter((res) => res && res.data?.success)
            .map((res) => res.data.data);

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
      const response = await API.post("/customer/createEvent", {
        dataToEvent,
        hallId,
        selectedChiefsId,
        location: hallId ? hallData?.hall_name : eventLocation,
        notesToHall,
        noteToChef,
      });
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

  const handleBack = () => {
    navigate("/customer/find-vendor", {
      state: {
        dataToEvent: dataToEvent,
        hallId: hallId,
        ChiefIds: selectedChiefsId,
      },
    });
  };

  return (
    <div className={classes.page}>
      <button onClick={handleBack}> Back</button>
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
