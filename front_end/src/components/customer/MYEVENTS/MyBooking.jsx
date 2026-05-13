import React from "react";
import classes from "./myBooking.module.css";
import { useEffect } from "react";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EventData from "../BOOKEVENT/EventData";

export default function MyBooking({ user, onStatusChange }) {
  const currentTime = new Date().toTimeString().slice(0, 5);
  const today = new Date().toISOString().split("T")[0];
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
      {" "}
      {/* כדאי לעטוף ב-div הראשי שלך */}
      {events.map((e) => {
        const hours = calculateDuration(e.start_time, e.end_time);
        const start_time = e.start_time.slice(0, 5);
        const end_time = e.end_time.slice(0, 5);

        // --- לוגיקה לבדיקה אם האירוע בעתיד ---
        const isFuture =
          e.requested_date > today ||
          (e.requested_date === today && start_time > currentTime);

        // האם הספק יכול לאשר/לדחות?
        const canProviderAction = rolePath === "provider" && isFuture;

        return (
          <div key={e.event_id} className={classes.eventCard}>
            {/* סטטוס */}
            <p className={classes[e.status?.toLowerCase()] || classes.pending}>
              Status: {rolePath === "customer" ? e.finalStatus : e.status}
            </p>

            <div>
              <p>
                <strong>Event Details</strong>
              </p>
              {rolePath !== "customer" && <p>{e.first_name}</p>}
              <p>Date: {e.requested_date}</p>
              <p>
                Time: {start_time} - {end_time} ({hours} hours)
              </p>

              {/* פרטי אולם ושפים (ללקוח בלבד) */}
              {rolePath !== "provider" && (
                <div className={classes.detailsSection}>
                  <strong>Hall:</strong> {e.hall_name} <br />
                  <strong>Chiefs:</strong>
                  {e.chiefs.map((chief) => (
                    <p key={chief.id} className={classes.smallText}>
                      {chief.name} | {chief.status}
                    </p>
                  ))}
                </div>
              )}

              {/* כפתורי לקוח */}
              {rolePath === "customer" && isFuture && (
                <div className={classes.actions}>
                  <button onClick={() => update(e)}>Update</button>
                  <button className={classes.cancelBtn}>Cancel</button>
                </div>
              )}

              {/* כפתורי ספק */}
              {canProviderAction && (
                <div className={classes.actions}>
                  {e.status !== "APPROVED" && (
                    <button
                      className={classes.approveBtn}
                      onClick={() =>
                        handlechangeStatus(e, e.event_id, "APPROVED")
                      }
                    >
                      Approve
                    </button>
                  )}
                  {e.status !== "REJECTED" && (
                    <button
                      className={classes.rejectBtn}
                      onClick={() =>
                        handlechangeStatus(e, e.event_id, "REJECTED")
                      }
                    >
                      Reject
                    </button>
                  )}
                </div>
              )}

              {/* הודעה לספק אם האירוע עבר */}
              {rolePath === "provider" &&
                !isFuture &&
                e.status === "PENDING" && (
                  <p className={classes.expiredNote}>Event time has passed</p>
                )}

              {/* כפתור ביקורת */}
              {rolePath === "customer" &&
                !isFuture &&
                e.finalStatus === "APPROVED" && (
                  <button className={classes.reviewBtn}>Write a Review</button>
                )}
            </div>
            <hr />
          </div>
        ); // סגירת return של ה-map
      })}{" "}
      {/* סגירת ה-map */}
    </div> // סגירת ה-div הראשי
  ); // סגירת return של הקומפוננטה
} // סגירת פונקציית MyBooking
