import React, { useState, useEffect } from "react";
import API from "../../../services/api";
import classes from "./bookEvent.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import EventData from "./EventData";

export default function BookEvent({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    dataToEvent = {},
    hallId = null,
    selectedChiefsId = [],
    eventId = dataToEvent?.event_id || null, // 👈 חילוץ מזהה האירוע
  } = location.state || {};

  const [hallData, setHallData] = useState(null);
  const [chiefsData, setChiefsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [eventLocation, setEventLocation] = useState("");
  const [notesToHall, setNotesToHall] = useState("");
  const [noteToChef, setNoteToChef] = useState({});

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

        if (selectedChiefsId.length > 0) {
          const requests = selectedChiefsId.map((id) =>
            API.get(`/customer/provider-details/${id}`).catch((err) => null),
          );

          const responses = await Promise.all(requests);
          const tempChiefs = responses
            .filter((res) => res && res.data?.success)
            .map((res) => res.data.data);

          setChiefsData(tempChiefs);
        }

        // 💡 שיחזור הערות קודמות במידה ומדובר בעדכון אירוע קיים
        if (eventId && dataToEvent) {
          if (dataToEvent.notesToHall) setNotesToHall(dataToEvent.notesToHall);
          if (dataToEvent.noteToChef) setNoteToChef(dataToEvent.noteToChef);
          if (dataToEvent.eventLocation) setEventLocation(dataToEvent.eventLocation);
        }
      } catch (error) {
        console.error("Error fetching providers details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProvidersData();
  }, [hallId, selectedChiefsId, location.state, navigate, eventId]);

  async function saveData() {
    if (!hallId && !eventLocation.trim()) {
      alert("Please select a location for the chefs!");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      dataToEvent,
      hallId,
      selectedChiefsId,
      location: hallId ? hallData?.hall_name : eventLocation,
      notesToHall,
      noteToChef,
    };

    try {
      let response;
      if (!eventId) {
        // إنشاء فقط: فحص 3 ساعات
        const dateStr = String(dataToEvent.requested_date).split("T")[0];
        const timeStr = String(dataToEvent.start_time).slice(0, 5);
        const eventStart = new Date(`${dateStr}T${timeStr}`);
        const hoursUntilStart = (eventStart - new Date()) / (1000 * 60 * 60);
        if (Number.isNaN(eventStart.getTime()) || hoursUntilStart < 3) {
          alert(
            "Events must be booked at least 3 hours before the start time.",
          );
          return;
        }
        response = await API.post("/customer/createEvent", payload);
      } else {
        response = await API.put(
          `/customer/updateEventData/${eventId}`,
          payload,
        );
      }
      if (response.data.success) {
        alert(
          eventId
            ? "Event Updated Successfully!"
            : "Event Booked Successfully!",
        );
        navigate("/customer/my-booking");
      } else {
        alert(response.data.message || "Action failed.");
      }
    } catch (error) {
      console.error("Save/Update failed:", error);
      alert(
        error.response?.data?.message || "Failed to save event details.",
      );
    }
    finally {
      setIsSubmitting(false);
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
        selectedChiefsId: selectedChiefsId,
        Event: eventId ? { ...dataToEvent, event_id: eventId } : null,
      },
    });
  };

  return (
    <div className={classes.page}>
      <button onClick={handleBack}> Back</button>
      <div className={classes.pageHeader}>
        <h1>{eventId ? "Update Your Event" : "Book Your Event"}</h1>
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

      {shouldShowButton && (
        <button
          className={classes.confirmBtn}
          onClick={saveData}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Saving..."
            : eventId
              ? "Update Event Now"
              : "Confirm & Book Now"}
        </button>
      )}
    </div>
  );
}
