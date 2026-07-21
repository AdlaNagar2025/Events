import React from "react";
import classes from "./calendar.module.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import { useCalendar } from "./useCalendar";
import {
  formatLocalDate,
  formatLocalTime,
  validateTimes,
  getTodayString,
} from "./calendarUtils";

export default function Calendar({ role, user }) {
  const {
    availableData,
    setAvailableData,
    loading,
    allEvents,
    isSlotExisting,
    handleSave,
    handleDelete,
    resetForm,
  } = useCalendar(role, user);

  const isProvider = role === "Chief" || role === "Hall_Owner";

  const handleSelect = (info) => {
    const selectedDate = formatLocalDate(info.start);
    const startTime = formatLocalTime(info.start);
    const endTime = formatLocalTime(info.end);

    if (!validateTimes(selectedDate, startTime, endTime)) return;

    setAvailableData({
      available_date: selectedDate,
      start_time: startTime,
      end_time: endTime,
    });
  };

  const handleEventClick = (clickInfo) => {
    const props = clickInfo.event.extendedProps;
    if (props.isSlot && isProvider) {
      setAvailableData({
        available_date: props.rawDate,
        start_time: props.startTime,
        end_time: props.endTime,
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAvailableData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className={classes.calendarContainer}>
      {isProvider && <h2>Manage Your Availability</h2>}

      <div className={classes.calendarWrapper}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          selectable={isProvider}
          editable={false}
          events={allEvents}
          select={handleSelect}
          eventClick={handleEventClick}
          allDaySlot={false}
          slotMinTime="08:00:00"
          slotMaxTime="24:00:00"
          nowIndicator={true}
          height="auto"
          headerToolbar={{
            start: "prev,next today",
            center: "title",
            end: "dayGridMonth,timeGridWeek",
          }}
        />
      </div>

      {/* טופס ניהול זמינות לספקים */}
      {isProvider && (
        <>
          <div className={classes.inputGroup}>
            <label>Date: </label>
            <input
              type="date"
              min={getTodayString()}
              value={availableData.available_date}
              name="available_date"
              onChange={handleChange}
            />
            <label>Start: </label>
            <input
              type="time"
              min="08:00"
              max="23:45"
              value={availableData.start_time}
              name="start_time"
              onChange={handleChange}
            />
            <label>End: </label>
            <input
              type="time"
              min="08:15"
              max="24:00"
              value={availableData.end_time}
              name="end_time"
              onChange={handleChange}
            />
          </div>

          {availableData.available_date &&
            availableData.start_time &&
            availableData.end_time && (
              <div className={classes.confirmBox}>
                <h4>Selected Slot Actions:</h4>
                <p>📅 {availableData.available_date}</p>
                <p>
                  ⏰ {availableData.start_time} - {availableData.end_time}
                </p>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleSave}
                    className={classes.saveBtn}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Slot"}
                  </button>

                  {isSlotExisting && (
                    <button
                      onClick={handleDelete}
                      className={classes.deleteBtn}
                      disabled={loading}
                    >
                      {loading ? "Deleting..." : "🗑️ Delete Slot"}
                    </button>
                  )}

                  <button
                    onClick={resetForm}
                    disabled={loading}
                    className={classes.cancelBtn}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}
