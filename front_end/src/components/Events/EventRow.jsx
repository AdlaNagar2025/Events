import classes from "./eventCard.module.css";
import { Rating } from "@mui/material";
import ReviewSection from "./ReviewSection";
import { useState } from "react";

function getStatusClass(status) {
  const s = (status || "").toUpperCase();
  if (s === "APPROVED") return "statusApproved";
  if (s === "REJECTED" || s === "DENY") return "statusRejected";
  if (s === "CANCELLED") return "statusCancelled";
  return "statusPending";
}

export default function EventRow({
  event,
  rolePath,
  isFuture,
  onUpdate,
  onCancel,
  onDisCancel,
  onChangeStatus,
}) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const status = event.finalStatus || event.status;


  const startTime = event.start_time?.slice(0, 5) || "";
  const endTime = event.end_time?.slice(0, 5) || "";
  
  const canProviderAction =
    rolePath === "provider" && isFuture && event.status !== "CANCELLED";

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
    <>
      {rolePath === "customer" && (
        <tr className={classes.eventCard}>
          <td>{event.requested_date}</td>
          <td>
            {startTime} - {endTime}
          </td>
          <td>
            <span
              className={`${classes.statusBadge} ${classes[getStatusClass(status)]}`}
            >
              {status}
            </span>
          </td>
          <td>{event.guest_number}</td>

          <td>
            <div className={classes.detailsSection}>
              <strong>Hall:</strong> {event.hall_name} |{" "}
              <span>{event.hall_status}</span>
              <br />
              <strong>Chiefs:</strong>
              {event.chiefs?.map((chief) => (
                <p key={chief.id} className={classes.smallText}>
                  {chief.name} |{" "}
                  <span className={classes[chief.status?.toLowerCase()]}>
                    {chief.status}
                  </span>
                </p>
              ))}
            </div>
          </td>

          <td>
            <div className={classes.actions}>
            {isFuture ? (
              <>
                <button
                  className={classes.updateBtn}
                  onClick={() => onUpdate(event)}
                >
                  Update
                </button>
                {event.finalStatus !== "CANCELLED" && (
                  <button
                    className={classes.rejectBtn}
                    onClick={() => onCancel(event)}
                  >
                    Cancel
                  </button>
                )}
                {event.finalStatus === "CANCELLED" && (
                  <button
                    className={classes.rejectBtn}
                    onClick={() => onDisCancel(event)}
                  >
                    DisCancel
                  </button>
                )}
              </>
            ) : (
              <>
                {event.finalStatus === "APPROVED" && (
                  <button
                    className={classes.reviewBtn}
                    onClick={() => setIsReviewOpen(true)}
                  >
                    Write a Review
                  </button>
                )}

                {event.rating && (
                  <div className={classes.reviewReceived}>
                    <h4>Client Review</h4>
                    <Rating value={event.rating} readOnly size="small" />
                    <p>"{event.comment}"</p>
                  </div>
                )}
              </>
            )}
            </div>

            {isReviewOpen && (
              <ReviewSection
                event={event}
                onClose={() => setIsReviewOpen(false)}
              />
            )}
          </td>
        </tr>
      )}

      {rolePath === "provider" && (
        <tr className={classes.eventCard}>
          <td>{event.first_name}</td>
          <td>{event.requested_date}</td>
          <td>
            {startTime} - {endTime}
          </td>
          <td>{event.finalStatus || event.status}</td>
          <td>{event.guest_number}</td>
          <td>{event.location}</td>
          <td>{event.notes}</td>

          <td>
            {canProviderAction && (
              <>
                {event.status !== "APPROVED" && (
                  <button
                    className={classes.approveBtn}
                    onClick={() =>
                      onChangeStatus(event, event.event_id, "APPROVED")
                    }
                  >
                    Approve
                  </button>
                )}
                {event.status !== "REJECTED" && (
                  <button
                    className={classes.rejectBtn}
                    onClick={() =>
                      onChangeStatus(event, event.event_id, "REJECTED")
                    }
                  >
                    Reject
                  </button>
                )}
              </>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
