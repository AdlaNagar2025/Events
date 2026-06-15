import classes from "./myBooking.module.css";
import { React, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import EventCard from "../../Events/EventCard";
import EventRow from "../../Events/EventRow";

export default function MyBooking({ user, onStatusChange }) {
  console.log(user, "in the Events hhhhhhhhhhhhh");
  const navigate = useNavigate();
  const [type, setType] = useState("All");
  const [events, setEvents] = useState([]);

  let rolePath = user?.role.toLowerCase();
  if (rolePath === "chief" || rolePath === "hall_owner") rolePath = "provider";

  const fetchAllEvents = async () => {
    try {
      let url = `http://localhost:3030/${rolePath}/myEventsData`;
      if (type === "All")
        url = `http://localhost:3030/${rolePath}/myEventsData`;
      else
        url = `http://localhost:3030/${rolePath}/AllEventsAccordingToStatus/${type}`;
      const response = await axios.get(url, { withCredentials: true });
      const rawData = response.data.data;
      const grouped = rawData.reduce((acc, current) => {
        const existingEvent = acc.find(
          (item) => item.event_id === current.event_id,
        );

        if (existingEvent) {
          // אם האירוע כבר קיים, רק נוסיף את השף לרשימה שלו
          if (!existingEvent.chiefs) existingEvent.chiefs = [];
          existingEvent.chiefs.push({
            id: current.chief_id,
            name: current.chief_name,
            status: current.chief_status,
            price: (
              calculateDuration(current.start_time, current.end_time) *
              current.price_per_hour
            ).toFixed(2),
          });
        } else {
          // אם זה אירוע חדש, ניצור אותו עם מערך שפים התחלתי
          acc.push({
            ...current,
            chiefs: [
              {
                id: current.chief_id,
                name: current.chief_name,
                status: current.chief_status,
                price: (
                  calculateDuration(current.start_time, current.end_time) *
                  current.price_per_hour
                ).toFixed(2),
              },
            ],
          });
        }
        return acc;
      }, []);

      setEvents(grouped); // שומרים ב-State את המערך הנקי ללא כפילויות
      console.log(grouped);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchAllEvents();
  }, [user, rolePath, type]);

  function update(e) {
    navigate("/customer/find-vendor", {
      state: {
        Event: e,
        hallId: e.hall_id,
        ChiefIds: e.chiefs.map((c) => c.id),
      },
    });
  }

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;

    const [startHours, startMinutes] = start.split(":").map(Number);
    const [endHours, endMinutes] = end.split(":").map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    // חישוב ההפרש בשעות (דקות חלקי 60)
    let diffInMinutes = endTotalMinutes - startTotalMinutes;
    // טיפול במקרה של מעבר חצות (למשל מ-22:00 עד 02:00)
    if (diffInMinutes < 0) {
      diffInMinutes += 24 * 60; // מוסיפים 1440 דקות
    }

    const durationInHours = diffInMinutes / 60;
    // החזרת מספר חיובי (למקרה שהזמנים הוזנו הפוך)
    return Math.max(0, durationInHours);
  };

  // async function handlechangeStatus(event, eventId, status) {
  //   try {
  //     const response = await axios.put(
  //       `http://localhost:3030/provider/changeEventStatus/${eventId}`,
  //       { status: status, eventData: event },
  //       { withCredentials: true },
  //     );

  //     if (response.data.success) {
  //       alert("Status updated successfully!");
  //       // 1. רענון הרשימה המקומית ב-MyBooking
  //       fetchAllEvents();
  //       // 2. הפעלת הריענון ב-Calendar דרך רכיב האב
  //       if (onStatusChange) {
  //         onStatusChange();
  //       }
  //     } else {
  //       alert(response.data.message);
  //     }
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }

  // סרקי והחליפי את הפונקציה הזו בתוך MyBooking שלך:

  async function handlechangeStatus(event, eventId, status, reason = null) {
    try {
      // קביעת מי יזם את הביטול במידה והסטטוס הוא ביטול
      let cancelledBy = null;
      if (status === "CANCELLED" || status === "CANCELED") {
        cancelledBy = "PROVIDER";
      }

      const response = await axios.put(
        `http://localhost:3030/provider/changeEventStatus/${eventId}`,
        {
          status: status,
          eventData: event,
          reason: reason, // ✨ נשלח לשרת
          cancelledBy: cancelledBy, // ✨ נשלח לשרת
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        alert(`Status updated to ${status} successfully!`);
        fetchAllEvents(); // רענון הרשימה המקומית
        if (onStatusChange) {
          onStatusChange(); // רענון הלוח שנה ברכיב האב
        }
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.log("Error updating event status:", error);
      alert("An error occurred while updating status.");
    }
  }

  async function handleCancel(event) {
    if (!window.confirm("Are you sure you want to cancel this event?")) return;
    try {
      const eventId = event.event_id;
      const response = await axios.put(
        `http://localhost:3030/customer/cancelEvent/${eventId}`,
        {},
        { withCredentials: true },
      );
      if (response.data.success) {
        alert("Event Cancelled Successfully");
        fetchAllEvents(); // ריענון הרשימה כדי שהסטטוס ישתנה/ייעלם
        if (onStatusChange) {
          onStatusChange(); // עדכון הלוח שנה אם צריך
        }
      }
    } catch (error) {
      console.log("Error cancelling event:", error);
      alert("Failed to cancel event");
    }
  }

  async function handleDisCancel(event) {
    if (!window.confirm("Are you sure you want to cancel this event?")) return;
    try {
      const eventId = event.event_id;
      const response = await axios.put(
        `http://localhost:3030/customer/disCancelEvent/${eventId}`,
        {},
        { withCredentials: true },
      );
      if (response.data.success) {
        alert("Event Dis Cancelled Successfully");
        fetchAllEvents(); // ריענון הרשימה כדי שהסטטוס ישתנה/ייעלם
        if (onStatusChange) {
          onStatusChange(); // עדכון הלוח שנה אם צריך
        }
      }
    } catch (error) {
      console.log("Error cancelling event:", error);
      alert("Failed to cancel event");
    }
  }

  const checkIfFuture = (event) => {
    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toTimeString().slice(0, 5);
    const startTime = event.start_time.slice(0, 5);

    return (
      event.requested_date > today ||
      (event.requested_date === today && startTime > currentTime)
    );
  };

  return (
    <div className={classes.page}>
      <div className={classes.pageHeader}>
        <h1>My Bookings</h1>
        <p>Track your events, providers, and booking status</p>
      </div>

      {rolePath === "provider" && (
        <div className={classes.toolbar}>
          <select
            className={classes.filterSelect}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="All">All Events</option>
            <option value="pending">Pending Events</option>
            <option value="approved">Approved Events</option>
            <option value="rejected">Rejected Events</option>
          </select>
        </div>
      )}

      {events.length === 0 ? (
        <p className={classes.emptyState}>No bookings found yet.</p>
      ) : (
        <div className={`${classes.tableWrapper} ${classes.eventList}`}>
          <table>
            <thead>
              <tr>
                {rolePath === "provider" && <th>Customer Name</th>}
                <th>Date</th>
                <th>Time</th>
                {rolePath === "customer" && <th>Status</th>}
                {rolePath === "provider" && <th>Status</th>}
                <th>Guests</th>
                {rolePath === "customer" && <th>Providers</th>}
                {user?.role === "Chief" && <th>Location</th>}
                {rolePath === "provider" && <th>Notes</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <EventRow
                  key={e.event_id}
                  event={e}
                  rolePath={rolePath}
                  role={user.role}
                  isFuture={checkIfFuture(e)}
                  onCancel={handleCancel}
                  onDisCancel={handleDisCancel}
                  onUpdate={update}
                  onChangeStatus={handlechangeStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
