import React from "react";
import classes from "./myBooking.module.css";
import { useEffect } from "react";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EventData from "../BOOKEVENT/EventData";

export default function MyBooking({ user, onStatusChange }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  let rolePath = user?.role.toLowerCase();
  if (rolePath === "chief" || rolePath === "hall_owner") rolePath = "provider";
  console.log(rolePath);
  const fetchAllEvents = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3030/${rolePath}/myEventsData`,
        { withCredentials: true },
      );

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
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchAllEvents();
  }, [user, rolePath]);

  function update(e) {
    navigate("/findavendor", {
      state: {
        Event: e,
        hallId: e.hall_id,
        ChiefIds: e.chiefs.map((c) => c.id),
      },
    });
  }

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;

    // הפיכת HH:MM למערך של מספרים
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

  //UPDATE event_providers SET status="PENDING" where event_providers.event_id=6

  // async function handlechangeStatus(event, eventId, status) {
  //   try {
  //     const response = await axios.put(
  //       `http://localhost:3030/provider/changeEventStatus/${eventId}`,
  //       { status: status, eventData: event },
  //       { withCredentials: true },
  //     );
  //     alert(response.data.success);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }
  async function handlechangeStatus(event, eventId, status) {
    try {
      const response = await axios.put(
        `http://localhost:3030/provider/changeEventStatus/${eventId}`,
        { status: status, eventData: event },
        { withCredentials: true },
      );
      console.log("RESPONSE:", response.data.data);
      if (response.data.success) {
        alert("Status updated successfully!");
        // 1. רענון הרשימה המקומית ב-MyBooking
        fetchAllEvents();
        // 2. הפעלת הריענון ב-Calendar דרך רכיב האב
        if (onStatusChange) {
          onStatusChange();
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

return (
  <div className={classes.event}>
    {events.map((e) => {
      const hours = calculateDuration(e.start_time, e.end_time);
      // חישוב המחיר הכולל לפי שעות
      const totalPrice = (e.price_per_hour * hours).toFixed(2);

      return (
        <div key={e.event_id} className={classes.eventCard}>
          {/* תצוגת סטטוס עליונה */}
          <p className={classes[e.status?.toLowerCase()] || classes.pending}>
            Status: {rolePath === "customer" ? e.finalStatus : e.status}
          </p>

          <div>
            <p>
              <strong>Event Details</strong>
            </p>
            <p>Date: {e.requested_date}</p>
            <p>
              Time: {e.start_time} - {e.end_time} ({hours} hours)
            </p>
            <p>Guests: {e.guest_number}</p>

            {rolePath !== "provider" && (
              <div className={classes.detailsSection}>
                <strong>Hall:</strong> {e.hall_name} (₪{e.price})
                <br />
                <strong>Chiefs:</strong>
                {e.chiefs.map((chief) => (
                  <p key={chief.id} className={classes.smallText}>
                    {chief.name} | ₪{chief.price} | {chief.status}
                  </p>
                ))}
              </div>
            )}

            {/* כפתורים ללקוח */}
            {rolePath === "customer" && (
              <div className={classes.actions}>
                <button onClick={() => update(e)}>Update</button>
                <button className={classes.cancelBtn}>Cancel</button>
              </div>
            )}

            {/* כפתורים לספק (Provider) */}
            {rolePath === "provider" && (
              <div className={classes.actions}>
                {/* הצגת כפתורים רק אם הסטטוס עדיין לא הוכרע */}
                {e.status !== "APPROVED" && (
                  <>
                    <button
                      className={classes.approveBtn}
                      onClick={() =>
                        handlechangeStatus(e, e.event_id, "APPROVED")
                      }
                    >
                      Approve
                    </button>
                    </>)}
                    {e.status !== "REJECTED" && 
                    (<>
                            <button
                      className={classes.rejectBtn}
                      onClick={() =>
                        handlechangeStatus(e, e.event_id, "REJECTED")
                      }
                    >
                      Reject
                    </button></>)
                    }
              {/* <br/>
                  <span className={classes.statusFixed}>
                    {e.status === "APPROVED" ? "Confirmed ✓" : "Rejected ✗"}
                  </span> */}
      
              </div>
            )}

            <hr />
            {/* ביקורת - רק אם האירוע עבר והיה מאושר */}
            {rolePath === "customer" &&
              new Date(e.requested_date) < new Date() &&
              e.finalStatus === "APPROVED" && (
                <button className={classes.reviewBtn}>Write a Review</button>
              )}
          </div>
        </div>
      );
    })}
  </div>
);}