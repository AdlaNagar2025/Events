import ReviewSection from "./ReviewSection";
import classes from "./eventCard.module.css";
import { Rating } from "@mui/material";
// EventCard.js
export default function EventRow({
  event,
  rolePath,
  isFuture,
  onUpdate,
  onCancel,
  onDisCancel,
  onChangeStatus, // שם ה-Prop שקיבלת מ-MyBooking
}) {
  console.log(event)
  const startTime = event.start_time.slice(0, 5);
  const endTime = event.end_time.slice(0, 5);

  const canProviderAction =
    rolePath === "provider" && isFuture && event.status !== "CANCELLED";

  return (
    <tr className={classes.eventCard}>
      {rolePath != "customer" && <p>{event.first_name}</p>}

      <td> {event.requested_date}</td>
      <td>
        {startTime} - {endTime}
      </td>
      <td>{event.status}</td>
      <td>{event.guest_number}</td>
      <td>{event.notes}</td>

      {canProviderAction && (
        <td>
          {event.status !== "APPROVED" && (
            <button
              className={classes.approveBtn}
              onClick={() => onChangeStatus(event, event.event_id, "APPROVED")} // תיקון כאן
            >
              Approve
            </button>
          )}
          {event.status !== "REJECTED" && (
            <button
              className={classes.rejectBtn}
              onClick={() => onChangeStatus(event, event.event_id, "REJECTED")} // תיקון כאן
            >
              Reject
            </button>
          )}
        </td>
      )}

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
    </tr>
  );
}
