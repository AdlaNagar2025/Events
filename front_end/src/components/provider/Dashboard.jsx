import React, { useEffect, useState } from "react";
import axios from "axios";
import classes from "./dashboard.module.css";

export default function Dashboard({ user, onStatusChange }) {
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [events, setEvents] = useState([]);

  // ✨ תיקון: מחזיק את ה-ID של האירוע הפתוח כרגע (או null אם הכל סגור)
  const [activeEventId, setActiveEventId] = useState(null);

  let rolePath = user?.role?.toLowerCase();
  if (rolePath === "chief" || rolePath === "hall_owner") rolePath = "provider";

  const checkIfFuture = (event) => {
    if (!event || !event.start_time) return false;
    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toTimeString().slice(0, 5);
    const startTime = event.start_time.slice(0, 5);

    const cleanEventDate = event.requested_date
      ? event.requested_date.split("T")[0]
      : "";

    return (
      cleanEventDate > today ||
      (cleanEventDate === today && startTime > currentTime)
    );
  };

  const fetchDataProfile = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3030/provider/MyBusinessStatusAndRating`,
        { withCredentials: true },
      );
      const rawData = response.data;
      setRating(rawData.avgRating || rawData.averageRating || 0);
      setReviewCount(rawData.reviewCount || 0);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (user) fetchDataProfile();
  }, [user]);

  async function handlechangeStatus(event, eventId, status) {
    try {
      const response = await axios.put(
        `http://localhost:3030/provider/changeEventStatus/${eventId}`,
        { status: status, eventData: event },
        { withCredentials: true },
      );

      if (response.data.success) {
        alert("Status updated successfully!");
        fetchAllPendingEvents();
        if (onStatusChange) {
          onStatusChange();
        }
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  }

  const fetchAllPendingEvents = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3030/provider/AllPendingEvents`,
        { withCredentials: true },
      );

      // ✨ תיקון ה-Reduce: התאמה לשדות האמיתיים של ה-SQL שלך (בלי השדות הפיקטיביים של chiefs)
      const rawData = response.data.data || [];
      const grouped = rawData.reduce((acc, current) => {
        const existingEvent = acc.find(
          (item) => item.event_id === current.event_id,
        );

        if (!existingEvent) {
          // מאחר והשאילתה שולפת אירועים ישירות לפי ה-provider_id הלוגין, אין כפילויות של שפים בשורה אחת
          acc.push(current);
        }
        return acc;
      }, []);

      setEvents(grouped);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (user) fetchAllPendingEvents();
  }, [user]);

  // פונקציית עזר לפתיחה/סגירה של שורת הפירוט
  const toggleDetails = (eventId) => {
    setActiveEventId(activeEventId === eventId ? null : eventId);
  };

  return (
    <div>
      <div>
        <p>Vendor Status Overview</p>
        {reviewCount > 0 && (
          <p>
            Avg.Rating: {rating}⭐ ({reviewCount} Reviews)
          </p>
        )}
      </div>
      <div>
        <p>Bookings Inbox</p>
        <table>
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Date</th>
              <th>View Details</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {events.map((e) => {
              const isFuture = checkIfFuture(e);
              const showActions =
                rolePath === "provider" && isFuture && e.status !== "CANCELLED";
              const isCurrentOpen = activeEventId === e.event_id;
              const cleanDisplayDate = e.requested_date
                ? e.requested_date.split("T")[0]
                : "";

              return (
                <React.Fragment key={e.event_id}>
                  {/* השורה הראשית של האירוע */}
                  <tr>
                    <td>{e.first_name}</td>
                    <td>{cleanDisplayDate}</td>
                    <td>
                      <button onClick={() => toggleDetails(e.event_id)}>
                        {isCurrentOpen ? "Hide Details" : "View Details"}
                      </button>
                    </td>
                    <td>
                      {showActions && (
                        <>
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
                        </>
                      )}
                    </td>
                  </tr>

                  {/* ✨ תיקון ה-JSX: הצגת הפירוט בתוך שורת טבלה תקנית (tr) שנפתחת רק לאירוע הנכון */}
                  {isCurrentOpen && (
                    <tr>
                      <td colSpan="4">
                        <div
                          style={{
                            padding: "15px",
                            backgroundColor: "#f9f9f9",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            textAlign: "left",
                          }}
                        >
                          <p>
                            <strong>Date:</strong> {cleanDisplayDate}
                          </p>
                          <p>
                            <strong>Time:</strong> {e.start_time?.slice(0, 5)} -{" "}
                            {e.end_time?.slice(0, 5)}
                          </p>
                          <p>
                            <strong>Guest Number:</strong> {e.guest_number}
                          </p>
                          {user?.role === "Chief" && (
                            <p>
                              <strong>Location:</strong>{" "}
                              {e.location || "Not specified"}
                            </p>
                          )}
                          <p>
                            <strong>Notes:</strong> {e.notes || "No notes"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
