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

  const handleProviderActionWithReason = (actionStatus) => {
    const actionName =
      actionStatus === "CANCELLED" ? "cancelling" : "rejecting";
    const userReason = prompt(
      `Please enter the reason for ${actionName} this request:`,
    );

    if (userReason === null) return; // הביטול בוטל על ידי המשתמש

    const cleanReason =
      userReason.trim() || "No reason provided by the business owner.";

    onChangeStatus(event, event.event_id, actionStatus, cleanReason);
  };

  return (
    <>
      {/* תצוגה עבור לקוח */}
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
              {/* פרטי אולם */}
              {event.hall_name && (
                <div>
                  <strong>Hall:</strong> {event.hall_name} |{" "}
                  <span
                    className={classes[(event.hall_status || "").toLowerCase()]}
                  >
                    {event.hall_status}
                  </span>
                  {event.hall_reason && (
                    <span className={classes.reasonText}>
                      {" "}
                      ({event.hall_reason})
                    </span>
                  )}
                </div>
              )}

              {/* פרטי שפים */}
              {/* פרטי שפים */}
              {event.chiefs && event.chiefs.length > 0 && (
                <div>
                  <strong>Chefs:</strong>
                  {event.chiefs.map((chief) => {
                    // חילוץ בטוח של השם והסטטוס
                    const chefName = chief.chief_name || chief.name;
                    const chefStatus = chief.chief_status || chief.status;

                    return (
                      <p
                        key={chief.chief_id || chief.id}
                        className={classes.smallText}
                      >
                        {chefName} |{" "}
                        <span
                          className={classes[(chefStatus || "").toLowerCase()]}
                        >
                          {chefStatus}
                        </span>
                        {chief.reason && (
                          <span className={classes.reasonText}>
                            {" "}
                            ({chief.reason})
                          </span>
                        )}
                      </p>
                    );
                  })}
                </div>
              )}

              {/* סיבת דחייה גלובלית במידה וקיימת */}
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
                  {event.finalStatus !== "CANCELLED" ? (
                    <button
                      className={classes.rejectBtn}
                      onClick={() => onCancel(event)}
                    >
                      Cancel
                    </button>
                  ) : (
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

      {/* תצוגה עבור ספק (Provider) */}
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
            {canProviderAction && (
              <>
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
        </tr>
      )}
    </>
  );
}
