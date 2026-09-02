import React, { useEffect, useState } from "react";
import API from "../../services/api";
import classes from "./dashboard.module.css";
import toast from "react-hot-toast";
import AppDialog from "../shared/AppDialog";

export default function Dashboard({ user, onStatusChange }) {
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [events, setEvents] = useState([]);
  const [rejectDialogEvent, setRejectDialogEvent] = useState(null);

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
      const response = await API.get(
        `/provider/MyBusinessStatusAndRating`,
      );
      const rawData = response.data;
      setRating(rawData.avgRating || rawData.averageRating || 0);
      setReviewCount(rawData.reviewCount || 0);
    } catch (error) {
      console.error("Error fetching profile rating:", error);
    }
  };

  useEffect(() => {
    if (user) fetchDataProfile();
  }, [user]);

  async function handlechangeStatus(event, eventId, status, reason = null) {
    try {
      const response = await API.put(
        `/provider/changeEventStatus/${eventId}`,
        {
          status,
          eventData: event,
          reason,
          cancelledBy: status === "CANCELLED" ? "PROVIDER" : null,
        },
      );
  
      if (response.data.success) {
        toast.success("Status updated successfully!");
        fetchAllPendingEvents();
        if (onStatusChange) onStatusChange();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error updating event status:", error);
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  }

  const fetchAllPendingEvents = async () => {
    try {
      const response = await API.get(
        `/provider/AllEventsAccordingToStatus/PENDING`,
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
      console.error("Error fetching pending events:", error);
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
              const status = (e.status || "").toUpperCase();
              const showActions =
                rolePath === "provider" && isFuture && status === "PENDING";

              const isCurrentOpen = activeEventId === e.event_id;
              const cleanDisplayDate = e.requested_date
                ? e.requested_date.split("T")[0]
                : "";

              return (
                <React.Fragment key={e.event_id}>
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
                          <button
                            className={classes.approveBtn}
                            onClick={() =>
                              handlechangeStatus(e, e.event_id, "APPROVED")
                            }
                          >
                            Approve
                          </button>
                          <button
                            className={classes.rejectBtn}
                            onClick={() => setRejectDialogEvent(e)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>

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

      <AppDialog
        open={!!rejectDialogEvent}
        title="Reject request"
        message="Please enter the reason for rejecting this request:"
        confirmLabel="Reject"
        danger
        withInput
        inputPlaceholder="Reason..."
        onCancel={() => setRejectDialogEvent(null)}
        onConfirm={(userReason) => {
          const event = rejectDialogEvent;
          const cleanReason = (userReason || "").trim();
          if (!cleanReason) {
            toast.error("A reason is required.");
            return;
          }
          setRejectDialogEvent(null);
          handlechangeStatus(event, event.event_id, "REJECTED", cleanReason);
        }}
      />
    </div>
  );
}
