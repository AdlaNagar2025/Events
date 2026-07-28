import classes from "./eventCard.module.css";
import { Rating } from "@mui/material";
import ReviewSection from "./ReviewSection";
import ReportSection from "./ReportSection";

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
  role,
  isFuture,
  onUpdate,
  onCancel,
  onDisCancel,
  onChangeStatus,
}) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
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
  // החליפי את פונקציית handleProviderReject ואת הכפתורים של הספק בגרסה הזו:

  const handleProviderActionWithReason = (actionStatus) => {
    const actionName =
      actionStatus === "CANCELLED" ? "cancelling" : "rejecting";
    const userReason = prompt(
      `Please enter the reason for ${actionName} this request:`,
    );

    // אם הספק לחץ על "ביטול" בתיבת ה-prompt, נעצור
    if (userReason === null) return;

    const cleanReason =
      userReason.trim() || "No reason provided by the business owner.";

    // קריאה לפונקציית האב עם 4 פרמטרים
    onChangeStatus(event, event.event_id, actionStatus, cleanReason);
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
              <span>
                {event.hall_status} || {event?.hall_reason}
              </span>
              <br />
              <strong>Chiefs:</strong>
              {event.chiefs?.map((chief) => (
                <p key={chief.id} className={classes.smallText}>
                  {chief.name} |{" "}
                  <span className={classes[chief.status?.toLowerCase()]}>
                    {chief.status} || {event.chiefs_reason}
                  </span>
                </p>
              ))}
              {event.rejection_reason && (
                <div
                  className={classes.reasonBox}
                  style={{
                    marginTop: "8px",
                    color: "#dc3545",
                    fontSize: "0.9em",
                  }}
                >
                  <strong>⚠️ Note:</strong> "{event.rejection_reason}"
                </div>
              )}
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
                    <div>
                      <button
                        className={classes.reviewBtn}
                        onClick={() => setIsReviewOpen(true)}
                      >
                        Write a Review
                      </button>
                      <button
                        className={classes.reviewBtn}
                        onClick={() => setIsReportOpen(true)}
                      >
                        🚩 Report
                      </button>
                    </div>
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

            {isReportOpen && (
              <ReportSection
                event={event}
                onClose={() => setIsReportOpen(false)}
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
          {role === "Chief" && <td>{event.location}</td>}
          <td>
            {event.notes}

            {event.rejection_reason && (
              <div
                style={{
                  fontStyle: "italic",
                  color: "#6c757d",
                  marginTop: "4px",
                }}
              >
                Reason sent: "{event.rejection_reason}"
              </div>
            )}
          </td>

          <td>
            {/* {canProviderAction && (
              <>
                <button
                  className={classes.approveBtn}
                  onClick={() =>
                    onChangeStatus(event, event.event_id, "CANCELLED")
                  }
                >
                  Cancel
                </button>

                {event.status !== "APPROVED" && (
                  <button
                    className={classes.approveBtn}
                    onClick={() =>
                      onChangeStatus(event, event.event_id, "APPROVED", null)
                    }
                  >
                    Approve
                  </button>
                )}
                {event.status !== "REJECTED" && (
                  <button
                    className={classes.rejectBtn}
                    onClick={handleProviderReject} // ✨ קריאה לפונקציה שמבקשת סיבה
                  >
                    Reject
                  </button>
                )}
              </>
            )} */}

            <td>
              {canProviderAction && (
                <>
                  {/* כפתור ביטול יזום על ידי הספק - דורש סיבה */}
                  <button
                    className={classes.rejectBtn}
                    onClick={() => handleProviderActionWithReason("CANCELLED")}
                  >
                    Cancel Event
                  </button>

                  {status !== "APPROVED" && (
                    <button
                      className={classes.approveBtn}
                      onClick={() =>
                        onChangeStatus(event, event.event_id, "APPROVED", null)
                      }
                    >
                      Approve
                    </button>
                  )}

                  {status !== "REJECTED" && (
                    <button
                      className={classes.rejectBtn}
                      onClick={() => handleProviderActionWithReason("REJECTED")}
                    >
                      Reject
                    </button>
                  )}
                </>
              )}
            </td>
          </td>
        </tr>
      )}
    </>
  );
}
