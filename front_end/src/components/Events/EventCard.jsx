import ReviewSection from "./ReviewSection";
import classes from "./eventCard.module.css";
import { Rating } from "@mui/material";
// EventCard.js
export default function EventCard({
  event,
  rolePath,
  isFuture,
  onUpdate,
  onCancel,
  onChangeStatus, // שם ה-Prop שקיבלת מ-MyBooking
}) {
  const startTime = event.start_time.slice(0, 5);
  const endTime = event.end_time.slice(0, 5);
  console.log(" {event.status}", event);

  const canProviderAction =
    rolePath === "provider" && isFuture && event.status !== "CANCELLED";

  return (
    <div className={classes.eventCard}>
      <p className={classes[event.status?.toLowerCase()] || classes.pending}>
        ● Status: {rolePath === "customer" ? event.finalStatus : event.status}
      </p>
      {rolePath != "customer" && <p>{event.first_name}</p>}

      <div className={classes.eventDetails}>
        <h3>Date: {event.requested_date}</h3>
        <p>
          Time: {startTime} - {endTime}
        </p>
      </div>

      {rolePath !== "provider" && (
        <div className={classes.detailsSection}>
          <strong>Hall:</strong> {event.hall_name}|
          <span>{event.hall_status}</span>
          <br />
          <strong>Chiefs:</strong>
          {event.chiefs?.map((chief) => (
            <p key={chief.id} className={classes.smallText}>
              {chief.name} |
              <span className={classes[chief.status?.toLowerCase()]}>
                {chief.status}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className={classes.actions}>
        {rolePath === "customer" && isFuture && (
          <>
            <button onClick={() => onUpdate(event)}>Update</button>
            {event.finalStatus !== "CANCELLED" && (
              <button
                className={classes.rejectBtn}
                onClick={() => onCancel(event)}
              >
                Cancel
              </button>
            )}
          </>
        )}

        {canProviderAction && (
          <>
            {event.status !== "APPROVED" && (
              <button
                className={classes.approveBtn}
                onClick={() =>
                  onChangeStatus(event, event.event_id, "APPROVED")
                } // תיקון כאן
              >
                Approve
              </button>
            )}
            {event.status !== "REJECTED" && (
              <button
                className={classes.rejectBtn}
                onClick={() =>
                  onChangeStatus(event, event.event_id, "REJECTED")
                } // תיקון כאן
              >
                Reject
              </button>
            )}
          </>
        )}
      </div>

      {!isFuture &&
        rolePath === "customer" &&
        event.finalStatus === "APPROVED" && <ReviewSection event={event} />}

      {event.rating && (
        <div className={classes.reviewReceived}>
          <h4>Client Review</h4>
          <Rating value={event.rating} readOnly />
          <p>"{event.comment}"</p>
        </div>
      )}
    </div>
  );
}
