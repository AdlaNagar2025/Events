import React, { useState } from "react";
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
} from "../../../utils/validation";
import AppDialog from "../../shared/AppDialog";
import AppModal from "../../shared/AppModal";

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

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const isProvider = role === "Chief" || role === "Hall_Owner";

  const slotReady =
    !!availableData.available_date &&
    !!availableData.start_time &&
    !!availableData.end_time;

  const dateLabel =
    availableData.available_date_end &&
    availableData.available_date_end !== availableData.available_date
      ? `${availableData.available_date} → ${availableData.available_date_end}`
      : availableData.available_date;

  const handleSelect = (info) => {
    const selectedDate = formatLocalDate(info.start);
    const startTime = formatLocalTime(info.start);
    const endTime = formatLocalTime(info.end);

    if (!validateTimes(selectedDate, startTime, endTime)) return;

    setAvailableData({
      available_date: selectedDate,
      available_date_end: "",
      start_time: startTime,
      end_time: endTime,
    });
  };

  const handleEventClick = (clickInfo) => {
    const props = clickInfo.event.extendedProps;
    if (props.isSlot && isProvider) {
      setAvailableData({
        available_date: props.rawDate,
        available_date_end: "",
        start_time: props.startTime,
        end_time: props.endTime,
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAvailableData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCloseActions = () => {
    if (loading) return;
    resetForm();
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
          height={520}
          expandRows={false}
          headerToolbar={{
            start: "prev,next today",
            center: "title",
            end: "dayGridMonth,timeGridWeek",
          }}
        />
      </div>

      {isProvider && (
        <div className={classes.inputGroup}>
          <div className={classes.field}>
            <label htmlFor="cal-date">Date</label>
            <input
              id="cal-date"
              type="date"
              min={getTodayString()}
              value={availableData.available_date}
              name="available_date"
              onChange={handleChange}
            />
          </div>
          <div className={classes.field}>
            <label htmlFor="cal-date-end">End date (optional)</label>
            <input
              id="cal-date-end"
              type="date"
              min={availableData.available_date || getTodayString()}
              value={availableData.available_date_end || ""}
              name="available_date_end"
              onChange={handleChange}
            />
          </div>
          <div className={classes.field}>
            <label htmlFor="cal-start">Start</label>
            <input
              id="cal-start"
              type="time"
              min="08:00"
              max="23:45"
              value={availableData.start_time}
              name="start_time"
              onChange={handleChange}
            />
          </div>
          <div className={classes.field}>
            <label htmlFor="cal-end">End</label>
            <input
              id="cal-end"
              type="time"
              min="08:15"
              max="24:00"
              value={availableData.end_time}
              name="end_time"
              onChange={handleChange}
            />
          </div>
        </div>
      )}

      <AppModal
        open={isProvider && slotReady}
        title="Assign availability"
        subtitle="Confirm the hours you want to mark as available."
        onClose={handleCloseActions}
        size="md"
      >
        <div className={classes.modalFields}>
          <div className={classes.field}>
            <label htmlFor="modal-date">Date</label>
            <input
              id="modal-date"
              type="date"
              min={getTodayString()}
              value={availableData.available_date}
              name="available_date"
              onChange={handleChange}
            />
          </div>
          <div className={classes.field}>
            <label htmlFor="modal-date-end">End date (optional)</label>
            <input
              id="modal-date-end"
              type="date"
              min={availableData.available_date || getTodayString()}
              value={availableData.available_date_end || ""}
              name="available_date_end"
              onChange={handleChange}
            />
          </div>
          <div className={classes.field}>
            <label htmlFor="modal-start">Start</label>
            <input
              id="modal-start"
              type="time"
              min="08:00"
              max="23:45"
              value={availableData.start_time}
              name="start_time"
              onChange={handleChange}
            />
          </div>
          <div className={classes.field}>
            <label htmlFor="modal-end">End</label>
            <input
              id="modal-end"
              type="time"
              min="08:15"
              max="24:00"
              value={availableData.end_time}
              name="end_time"
              onChange={handleChange}
            />
          </div>
        </div>

        <div className={classes.modalSummary}>
          <p>📅 {dateLabel}</p>
          <p>
            ⏰ {availableData.start_time} - {availableData.end_time}
          </p>
        </div>

        <div className={classes.confirmActions}>
          <button
            type="button"
            onClick={handleSave}
            className={classes.saveBtn}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Slot"}
          </button>

          {isSlotExisting && (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className={classes.deleteBtn}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Slot"}
            </button>
          )}

          <button
            type="button"
            onClick={handleCloseActions}
            disabled={loading}
            className={classes.cancelBtn}
          >
            Cancel
          </button>
        </div>
      </AppModal>

      <AppDialog
        open={deleteConfirmOpen}
        title="Remove availability"
        message={
          availableData.available_date_end &&
          availableData.available_date_end !== availableData.available_date
            ? `Remove ${availableData.start_time}–${availableData.end_time} from ${availableData.available_date} → ${availableData.available_date_end}? Days with approved events will be skipped.`
            : "Are you sure you want to remove this availability?"
        }
        confirmLabel="Remove"
        danger
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          handleDelete();
        }}
      />
    </div>
  );
}
