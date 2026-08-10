import classes from "./myBooking.module.css";
import { React, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../../services/api";
import toast from "react-hot-toast";

import EventRow from "../../Events/EventRow";

export default function MyBooking({ user, onStatusChange }) {
  const navigate = useNavigate();
  const [type, setType] = useState("All");
  const [events, setEvents] = useState([]);

  let rolePath = user?.role.toLowerCase();
  if (rolePath === "chief" || rolePath === "hall_owner") rolePath = "provider";

  const fetchAllEvents = async () => {
    try {
      let url = `/${rolePath}/myEventsData`;
      if (type !== "All") {
        url = `/${rolePath}/AllEventsAccordingToStatus/${type}`;
      }

      const response = await API.get(url);
      const rawData = response.data.data;

      // השרת כבר מחזיר נתונים מקובצים ונקיים! אין צורך ב-reduce כפול ב-Frontend
      setEvents(rawData || []);
      console.log("Fetched events:", rawData);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  useEffect(() => {
    fetchAllEvents();
  }, [user, rolePath, type]);


  function update(e) {
    navigate("/customer/find-vendor", {
      state: {
        Event: e,
        hallId: e.hall_id || null,
        selectedChiefsId: e.chiefs
          ? e.chiefs.map((c) => c.chief_id || c.id)
          : [],
      },
    });
  }

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;

    const [startHours, startMinutes] = start.split(":").map(Number);
    const [endHours, endMinutes] = end.split(":").map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    let diffInMinutes = endTotalMinutes - startTotalMinutes;
    if (diffInMinutes < 0) {
      diffInMinutes += 24 * 60; // טיפול במעבר חצות
    }

    const durationInHours = diffInMinutes / 60;
    return Math.max(0, durationInHours);
  };

  async function handlechangeStatus(event, eventId, status, reason = null) {
    try {
      let cancelledBy = null;
      if (status === "CANCELLED") {
        cancelledBy = "PROVIDER";
      }

      const response = await API.put(`/provider/changeEventStatus/${eventId}`, {
        status: status,
        eventData: event,
        reason: reason,
        cancelledBy: cancelledBy,
      });

      if (response.data.success) {
        toast.success(`Status updated to ${status} successfully!`);
        fetchAllEvents(); // רענון הרשימה המקומית
        if (onStatusChange) {
          onStatusChange(); // רענון הלוח שנה ברכיב האב
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error updating event status:", error);
      toast.error("An error occurred while updating status.");
    }
  }


  async function handleCancel(event) {
    if (!window.confirm("Are you sure you want to cancel this event?")) return;
    try {
      const eventId = event.event_id;
      const response = await API.put(
        `/customer/cancelEvent/${eventId}`,
        {},
        { withCredentials: true },
      );
      if (response.data.success) {
        toast.success("Event Cancelled Successfully");
        fetchAllEvents();
        if (onStatusChange) onStatusChange();
      } else {
        toast.error(response.data.message || "Failed to cancel event");
      }
    } catch (error) {
      console.error("Error cancelling event:", error);
      toast.error(error.response?.data?.message || "Failed to cancel event");
    }
  }
  
  async function handleDisCancel(event) {
    if (
      !window.confirm(
        "Are you sure you want to reinstate this cancelled event?",
      )
    )
      return;
  
    try {
      const eventId = event.event_id;
      const response = await API.put(
        `/customer/disCancelEvent/${eventId}`,
        {},
        { withCredentials: true },
      );
      if (response.data.success) {
        toast.success("Event reinstated successfully");
        fetchAllEvents();
        if (onStatusChange) onStatusChange();
      } else {
        toast.error(response.data.message || "Failed to reinstate event");
      }
    } catch (error) {
      console.error("Error reinstating event:", error);
      toast.error(error.response?.data?.message || "Failed to reinstate event");
    }
  }
  


  const checkIfFuture = (event) => {
    if (!event.requested_date || !event.start_time) return false;

    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toTimeString().slice(0, 5);
    const startTime = event.start_time.slice(0, 5);

    return (
      event.requested_date > today ||
      (event.requested_date === today && startTime > currentTime)
    );
  };

  return (
    <div className={classes.page}>
      <div className={classes.pageHeader}>
        <h1>My Bookings</h1>
        <p>Track your events, providers, and booking status</p>
      </div>

      {rolePath === "provider" && (
        <div className={classes.toolbar}>
          <select
            className={classes.filterSelect}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="All">All Events</option>
            <option value="pending">Pending Events</option>
            <option value="approved">Approved Events</option>
            <option value="rejected">Rejected Events</option>
          </select>
        </div>
      )}

      {events.length === 0 ? (
        <p className={classes.emptyState}>No bookings found yet.</p>
      ) : (
        <div className={`${classes.tableWrapper} ${classes.eventList}`}>
          <table>
            <thead>
              <tr>
                {rolePath === "provider" && <th>Customer Name</th>}
                <th>Date</th>
                <th>Time</th>
                {rolePath === "customer" && <th>Status</th>}
                {rolePath === "provider" && <th>Status</th>}
                <th>Guests</th>
                {rolePath === "customer" && <th>Providers</th>}
                {user?.role === "Chief" && <th>Location</th>}
                {rolePath === "provider" && <th>Notes</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <EventRow
                  key={e.event_id}
                  event={e}
                  rolePath={rolePath}
                  role={user.role}
                  isFuture={checkIfFuture(e)}
                  onCancel={handleCancel}
                  onDisCancel={handleDisCancel}
                  onUpdate={update}
                  onChangeStatus={handlechangeStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
