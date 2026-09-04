import React, { useEffect, useState } from "react";
import API from "../../services/api";
import classes from "./dashboard.module.css";
import toast from "react-hot-toast";
import AppDialog from "../shared/AppDialog";
import AppModal from "../shared/AppModal";

export default function Dashboard({ user, onStatusChange }) {
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectDialogEvent, setRejectDialogEvent] = useState(null);
  const [detailsEvent, setDetailsEvent] = useState(null);

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
      const response = await API.get(`/provider/MyBusinessStatusAndRating`);
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
    setLoading(true);
    try {
      const response = await API.get(
        `/provider/AllEventsAccordingToStatus/PENDING`,
      );

      const rawData = response.data.data || [];
      const grouped = rawData.reduce((acc, current) => {
        const existingEvent = acc.find(
          (item) => item.event_id === current.event_id,
        );

        if (!existingEvent) {
          acc.push(current);
        }
        return acc;
      }, []);

      setEvents(grouped);
    } catch (error) {
      console.error("Error fetching pending events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchAllPendingEvents();
  }, [user]);

  const detailsDate = detailsEvent?.requested_date
    ? detailsEvent.requested_date.split("T")[0]
    : "";
  const detailsClient = detailsEvent
    ? `${detailsEvent.first_name || ""}${detailsEvent.last_name ? ` ${detailsEvent.last_name}` : ""}`.trim()
    : "";

  return (
    <div className={classes.page}>
      <header className={classes.pageHeader}>
        <div>
          <h1>Vendor Status Overview</h1>
          <p>Review and respond to pending booking requests.</p>
        </div>
        <div className={classes.stats}>
          <div className={classes.statChip}>
            <span className={classes.statLabel}>Pending</span>
            <strong>{events.length}</strong>
          </div>
          {reviewCount > 0 && (
            <div className={classes.statChip}>
              <span className={classes.statLabel}>Rating</span>
              <strong>
                {Number(rating).toFixed(1)}★ ({reviewCount})
              </strong>
            </div>
          )}
        </div>
      </header>

      <section className={classes.inboxCard}>
        <div className={classes.inboxHeader}>
          <h2>Bookings Inbox</h2>
          <span className={classes.inboxHint}>Pending requests only</span>
        </div>

        {loading ? (
          <div className={classes.emptyState}>Loading requests...</div>
        ) : events.length === 0 ? (
          <div className={classes.emptyState}>
            No pending bookings right now.
          </div>
        ) : (
          <div className={classes.tableWrap}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const isFuture = checkIfFuture(e);
                  const status = (e.status || "").toUpperCase();
                  const showActions =
                    rolePath === "provider" &&
                    isFuture &&
                    status === "PENDING";
                  const cleanDisplayDate = e.requested_date
                    ? e.requested_date.split("T")[0]
                    : "";

                  return (
                    <tr key={e.event_id}>
                      <td className={classes.clientCell}>
                        {e.first_name}
                        {e.last_name ? ` ${e.last_name}` : ""}
                      </td>
                      <td>{cleanDisplayDate}</td>
                      <td>
                        <button
                          type="button"
                          className={classes.detailsBtn}
                          onClick={() => setDetailsEvent(e)}
                        >
                          View Details
                        </button>
                      </td>
                      <td>
                        {showActions ? (
                          <div className={classes.actionBtns}>
                            <button
                              type="button"
                              className={classes.approveBtn}
                              onClick={() =>
                                handlechangeStatus(e, e.event_id, "APPROVED")
                              }
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className={classes.rejectBtn}
                              onClick={() => setRejectDialogEvent(e)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className={classes.mutedAction}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AppModal
        open={!!detailsEvent}
        title="Booking details"
        subtitle={detailsClient || undefined}
        onClose={() => setDetailsEvent(null)}
        size="md"
      >
        {detailsEvent && (
          <div className={classes.detailsBox}>
            <div className={classes.detailItem}>
              <span>Date</span>
              <strong>{detailsDate}</strong>
            </div>
            <div className={classes.detailItem}>
              <span>Time</span>
              <strong>
                {detailsEvent.start_time?.slice(0, 5)} –{" "}
                {detailsEvent.end_time?.slice(0, 5)}
              </strong>
            </div>
            <div className={classes.detailItem}>
              <span>Guests</span>
              <strong>{detailsEvent.guest_number || "—"}</strong>
            </div>
            {user?.role === "Chief" ? (
              <div className={classes.detailItem}>
                <span>Location</span>
                <strong>{detailsEvent.location || "Not specified"}</strong>
              </div>
            ) : (
              <div className={classes.detailItem}>
                <span>Client</span>
                <strong>{detailsClient || "—"}</strong>
              </div>
            )}
            <div className={`${classes.detailItem} ${classes.detailNotes}`}>
              <span>Notes</span>
              <strong>{detailsEvent.notes || "No notes"}</strong>
            </div>
          </div>
        )}
      </AppModal>

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
