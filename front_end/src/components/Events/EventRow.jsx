import classes from "./eventCard.module.css";
import { Rating } from "@mui/material";
import ReviewSection from "./ReviewSection";
import ReportSection from "./ReportSection";
import { useState } from "react";
import AppDialog from "../shared/AppDialog";
import AppModal from "../shared/AppModal";
import toast from "react-hot-toast";

function getStatusClass(status) {
  const s = (status || "").toUpperCase();
  if (s === "APPROVED") return "statusApproved";
  if (s === "REJECTED" || s === "DENY") return "statusRejected";
  if (s === "CANCELLED") return "statusCancelled";
  return "statusPending";
}

function providerSummary(event) {
  const parts = [];
  if (event.hall_name) parts.push(event.hall_name);
  if (event.chiefs?.length) {
    parts.push(
      `${event.chiefs.length} chef${event.chiefs.length > 1 ? "s" : ""}`,
    );
  }
  return parts.join(" · ") || "No providers";
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reasonDialog, setReasonDialog] = useState(null);
  const [approveConfirm, setApproveConfirm] = useState(false);

  const startTime = event.start_time?.slice(0, 5) || "";
  const endTime = event.end_time?.slice(0, 5) || "";
  // Customer sees overall final status; provider actions use their own row status.
  const customerStatus = (event.finalStatus || event.status || "").toUpperCase();
  const providerStatus = (event.status || "").toUpperCase();
  const status = rolePath === "provider" ? providerStatus : customerStatus;

  const canProviderAction =
    rolePath === "provider" &&
    isFuture &&
    (providerStatus === "PENDING" || providerStatus === "APPROVED");

  const openReasonDialog = (actionStatus) => {
    setReasonDialog({ actionStatus });
  };

  const submitReasonDialog = (userReason) => {
    if (!reasonDialog) return;
    const cleanReason = (userReason || "").trim();
    if (!cleanReason) {
      toast.error("A reason is required.");
      return;
    }
    const actionStatus = reasonDialog.actionStatus;
    setReasonDialog(null);
    onChangeStatus(event, event.event_id, actionStatus, cleanReason);
  };

  const canModifyByPolicy = (() => {
    if (!event.requested_date || !event.start_time) return false;
    const dateStr = String(event.requested_date).split("T")[0];
    const timeStr = String(event.start_time).slice(0, 5);
    const eventDate = new Date(`${dateStr}T${timeStr}`);
    const hoursLeft = (eventDate - new Date()) / (1000 * 60 * 60);
    return hoursLeft >= 48;
  })();

  // Hall cancelled → customer must pick a new hall OR keep chefs with a city/location
  const hallNeedsPlace =
    rolePath === "customer" &&
    String(event.hall_status || "").toUpperCase() === "CANCELLED";

  const providersPanel = (
    <div className={classes.detailsSection}>
      {event.hall_name && (
        <div className={classes.detailRow}>
          <strong>Hall:</strong> {event.hall_name}{" "}
          <span
            className={`${classes.statusBadge} ${classes[getStatusClass(event.hall_status)]}`}
          >
            {event.hall_status}
          </span>
          {event.hall_reason && (
            <span className={classes.reasonText}> ({event.hall_reason})</span>
          )}
        </div>
      )}

      {hallNeedsPlace && (
        <div className={classes.venueAlert}>
          The venue cancelled this booking. Choose a new hall, or continue with
          chefs only and set a city/location for the event.
        </div>
      )}

      {event.chiefs && event.chiefs.length > 0 && (
        <div className={classes.detailRow}>
          <strong>Chefs:</strong>
          {event.chiefs.map((chief) => {
            const chefName = chief.chief_name || chief.name;
            const chefStatus = chief.chief_status || chief.status;
            return (
              <p key={chief.chief_id || chief.id} className={classes.smallText}>
                {chefName}{" "}
                <span
                  className={`${classes.statusBadge} ${classes[getStatusClass(chefStatus)]}`}
                >
                  {chefStatus}
                </span>
                {(chief.chiefs_reason || chief.reason) && (
                  <span className={classes.reasonText}>
                    {" "}
                    ({chief.chiefs_reason || chief.reason})
                  </span>
                )}
              </p>
            );
          })}
        </div>
      )}

      {event.rejection_reason && (
        <div className={classes.reasonBox}>
          <strong>Note:</strong> "{event.rejection_reason}"
        </div>
      )}
    </div>
  );

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
            <div className={classes.providersCell}>
              <span className={classes.providersSummary}>
                {providerSummary(event)}
              </span>
              <button
                type="button"
                className={classes.detailsBtn}
                onClick={() => setDetailsOpen(true)}
              >
                Details
              </button>
            </div>
          </td>
          <td>
            <div className={classes.actions}>
              {isFuture ? (
                <>
                  {hallNeedsPlace && (
                    <span className={classes.venueAlertInline}>
                      Venue cancelled — set a new hall or a location
                    </span>
                  )}

                  <button
                    className={classes.updateBtn}
                    disabled={!canModifyByPolicy}
                    title={
                      !canModifyByPolicy
                        ? "Locked within 48 hours of the event."
                        : hallNeedsPlace
                          ? "Pick a new hall, or chefs with a city/location"
                          : ""
                    }
                    onClick={() => onUpdate(event)}
                  >
                    {hallNeedsPlace ? "Fix place" : "Update"}
                  </button>

                  {event.finalStatus !== "CANCELLED" ? (
                    <button
                      className={classes.rejectBtn}
                      disabled={!canModifyByPolicy}
                      title={
                        !canModifyByPolicy
                          ? "Locked within 48 hours of the event."
                          : ""
                      }
                      onClick={() => onCancel(event)}
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      className={classes.rejectBtn}
                      disabled={!canModifyByPolicy}
                      onClick={() => onDisCancel(event)}
                    >
                      DisCancel
                    </button>
                  )}

                  {!canModifyByPolicy && (
                    <span
                      className={classes.policyNote}
                      title="Changes are locked within 48 hours of the event. Contact your providers."
                    >
                      Locked (48h)
                    </span>
                  )}
                </>
              ) : (
                <>
                  {event.finalStatus === "APPROVED" && (
                    <>
                      <button
                        className={classes.reviewBtn}
                        onClick={() => setIsReviewOpen(true)}
                      >
                        Review
                      </button>
                      <button
                        className={classes.reviewBtn}
                        onClick={() => setIsReportOpen(true)}
                      >
                        Report
                      </button>
                    </>
                  )}

                  {event.rating && (
                    <button
                      type="button"
                      className={classes.detailsBtn}
                      onClick={() => setDetailsOpen(true)}
                    >
                      View review
                    </button>
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
          <td>
            <span
              className={`${classes.statusBadge} ${classes[getStatusClass(providerStatus)]}`}
            >
              {providerStatus || "—"}
            </span>
          </td>
          <td>{event.guest_number}</td>
          {role === "Chief" && <td>{event.location}</td>}
          <td>
            <div className={classes.notesCell}>
              <span>{event.notes || "—"}</span>
              {event.rejection_reason && (
                <button
                  type="button"
                  className={classes.detailsBtn}
                  onClick={() => setDetailsOpen(true)}
                >
                  View note
                </button>
              )}
            </div>
          </td>
          <td>
            {canProviderAction && (
              <div className={classes.actions}>
                {providerStatus === "PENDING" && (
                  <>
                    <button
                      className={classes.approveBtn}
                      onClick={() => setApproveConfirm(true)}
                    >
                      Approve
                    </button>
                    <button
                      className={classes.rejectBtn}
                      onClick={() => openReasonDialog("REJECTED")}
                    >
                      Reject
                    </button>
                  </>
                )}

                {providerStatus === "APPROVED" && (
                  <button
                    className={classes.rejectBtn}
                    disabled={!canModifyByPolicy}
                    title={
                      !canModifyByPolicy
                        ? "Cannot cancel less than 48 hours before the event."
                        : ""
                    }
                    onClick={() => openReasonDialog("CANCELLED")}
                  >
                    Cancel
                  </button>
                )}

                {providerStatus === "APPROVED" && !canModifyByPolicy && (
                  <span
                    className={classes.policyNote}
                    title="Cannot cancel less than 48 hours before the event."
                  >
                    Locked (48h)
                  </span>
                )}
              </div>
            )}
          </td>
        </tr>
      )}

      <AppModal
        open={detailsOpen}
        title={
          rolePath === "customer"
            ? "Event providers"
            : event.rejection_reason
              ? "Rejection note"
              : "Event details"
        }
        subtitle={`${event.requested_date || ""} · ${startTime}-${endTime}`}
        onClose={() => setDetailsOpen(false)}
      >
        {rolePath === "customer" ? (
          <>
            {providersPanel}
            {event.rating && (
              <div className={classes.reviewReceived}>
                <h4>Client Review</h4>
                <Rating value={event.rating} readOnly size="small" />
                <p>"{event.comment}"</p>
              </div>
            )}
          </>
        ) : (
          <div className={classes.reasonBox}>
            <strong>Reason sent:</strong> "{event.rejection_reason}"
          </div>
        )}
      </AppModal>

      <AppDialog
        open={!!reasonDialog}
        title={
          reasonDialog?.actionStatus === "CANCELLED"
            ? "Cancel booking"
            : "Reject request"
        }
        message={`Please enter the reason for ${
          reasonDialog?.actionStatus === "CANCELLED"
            ? "cancelling"
            : "rejecting"
        } this booking:`}
        confirmLabel="Submit"
        danger
        withInput
        inputPlaceholder="Reason (required)..."
        onCancel={() => setReasonDialog(null)}
        onConfirm={submitReasonDialog}
      />

      <AppDialog
        open={approveConfirm}
        title="Approve request"
        message="Approve this event request?"
        confirmLabel="Approve"
        onCancel={() => setApproveConfirm(false)}
        onConfirm={() => {
          setApproveConfirm(false);
          onChangeStatus(event, event.event_id, "APPROVED", null);
        }}
      />
    </>
  );
}
