import React, { useState, useEffect } from "react";
import classes from "./calendar.module.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

export default function Calendar({ role, user }) {
  const [availableData, setAvailableData] = useState({
    available_date: "",
    start_time: "",
    end_time: "",
  });
  const [loading, setLoading] = useState(false);
  const [worksHour, setWorksHour] = useState([]);
  const [events, setEvents] = useState([]);

  console.log("worksHourrr", worksHour);

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const validateTimes = (date, start, end) => {
    const todayStr = getTodayString();
    if (date < todayStr) {
      alert("You cannot select a date in the past!");
      return false;
    }
    if (date === todayStr) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (start < currentTime) {
        alert("You cannot select a time that has already passed today!");
        return false;
      }
    }
    if (start < "08:00" || end > "24:00") {
      alert("Working hours are restricted between 08:00 and 24:00!");
      return false;
    }
    if (start >= end) {
      alert("End time must be strictly after the start time.");
      return false;
    }
    return true;
  };

  const fetchAvailability = async () => {
    try {
      let url;
      if (role === "Chief" || role === "Hall_Owner")
        url = "http://localhost:3030/provider/getMyCalendar";
      else if (role === "Admin" || role === "Customer")
        url = `http://localhost:3030/${role.toLowerCase()}/ProviderCalendar/${user.id}`;

      const response = await axios.get(url, { withCredentials: true });
      if (response.data.success) {
        const dataFromDB = response.data.data || [];
        const formattedWorksHour = dataFromDB.map((item) => {
          const d = new Date(item.available_date);
          const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

          const cleanStart = item.start_time.substring(0, 5); // הופך "10:00:00" ל-"10:00"
          const cleanEnd = item.end_time.substring(0, 5); // הופך "15:00:00" ל-"15:00"

          return {
            title: "🟢 Available",
            start: `${localDate}T${cleanStart}`,
            end: `${localDate}T${cleanEnd}`,
            backgroundColor: "#28a745",
            borderColor: "#68c47e",
            allDay: false,
            extendedProps: {
              rawDate: localDate,
              startTime: cleanStart, // ✨ עכשיו זה יישמר נקי בלי שניות
              endTime: cleanEnd, // ✨ עכשיו זה יישמר נקי בלי שניות
              isSlot: true,
            },
          };
        });
        setWorksHour(formattedWorksHour);
      }
    } catch (error) {
      console.error("Error fetching calendar:", error);
      setWorksHour([]);
    }
  };

  const fetchgetAllEventsApproved = async () => {
    try {
      let url;
      if (role === "Chief" || role === "Hall_Owner")
        url = "http://localhost:3030/provider/AllEventsApproved";
      else if (role === "Admin" || role === "Customer")
        url = `http://localhost:3030/${role.toLowerCase()}/ProviderEvents/${user.id}`;

      const response = await axios.get(url, { withCredentials: true });
      const dataFromDB = response.data.data || [];
      const formattedEvents = dataFromDB.map((item) => {
        const d = new Date(item.requested_date);
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return {
          title: "Event",
          start: `${localDate}T${item.start_time}`,
          end: `${localDate}T${item.end_time}`,
          backgroundColor: "#2889a7",
          borderColor: "#c4687f",
          allDay: false,
          extendedProps: { isSlot: false },
        };
      });
      setEvents(formattedEvents);
    } catch (error) {
      console.error("Error fetching approved events:", error);
      setEvents([]);
    }
  };

  useEffect(() => {
    fetchAvailability();
    fetchgetAllEventsApproved();
  }, []);

  const handleSelect = (info) => {
    const selectedDate = info.start.toISOString().split("T")[0];
    const startTime = info.start.toTimeString().substring(0, 5);
    const endTime = info.end.toTimeString().substring(0, 5);

    if (!validateTimes(selectedDate, startTime, endTime)) return;

    setAvailableData({
      available_date: selectedDate,
      start_time: startTime,
      end_time: endTime,
    });
  };

  // ✨ פונקציה שמזהה לחיצה על משבצת קיימת וממלאת את האינפוטים למטה
  const handleEventClick = (clickInfo) => {
    const props = clickInfo.event.extendedProps;
    if (props.isSlot && (role === "Chief" || role === "Hall_Owner")) {
      setAvailableData({
        available_date: props.rawDate,
        start_time: props.startTime,
        end_time: props.endTime,
      });
    }
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setAvailableData((prev) => ({ ...prev, [name]: value }));
  }

  const handleSave = async () => {
    const { available_date, start_time, end_time } = availableData;
    if (!available_date || !start_time || !end_time) {
      alert("Please select a valid time slot first.");
      return;
    }
    if (!validateTimes(available_date, start_time, end_time)) return;

    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3030/provider/fillCalendar",
        availableData,
        { withCredentials: true },
      );
      if (response.data.success) {
        alert("Availability saved successfully! ✨");
        setAvailableData({ available_date: "", start_time: "", end_time: "" });
        fetchAvailability();
      } else {
        alert(response.data.message || "Failed to save availability.");
      }
    } catch (error) {
      console.error("Calendar save error:", error);
      alert(error.response?.data?.message || "Failed to save availability.");
    } finally {
      setLoading(false);
    }
  };

  // ✨ פונקציית המחיקה המעודכנת שמדברת עם הראוט החדש בבקאנד
  const handleDelete = async () => {
    const { available_date, start_time, end_time } = availableData;
    if (!available_date || !start_time || !end_time) {
      alert("Please select a valid time slot to delete.");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to remove this availability?",
    );
    if (!confirmDelete) return;

    setLoading(true);
    try {
      // שליחת בקשת POST/PUT ייעודית לעדכון היומן (מחיקת המקטע)
      const response = await axios.post(
        "http://localhost:3030/provider/updateCalendar",
        availableData,
        { withCredentials: true },
      );

      if (response.data.success) {
        alert("Availability removed successfully! 🗑️");
        setAvailableData({ available_date: "", start_time: "", end_time: "" });
        fetchAvailability(); // ריענון היומן
      } else {
        alert(response.data.message || "Failed to delete availability.");
      }
    } catch (error) {
      console.error("Calendar delete error:", error);
      alert(error.response?.data?.message || "Failed to delete availability.");
    } finally {
      setLoading(false);
    }
  };

  // הבדיקה החכמה: מחפשים האם יש משבצת ביומן שתואמת בדיוק לערכים שבאינפוטים
  const isSlotExisting = worksHour.some((slot) => {
    const slotDate = slot.start.split("T")[0]; // מוציא רק את ה-YYYY-MM-DD
    const slotStart = slot.start.split("T")[1].substring(0, 5); // מוציא את ה-HH:MM
    const slotEnd = slot.end.split("T")[1].substring(0, 5); // מוציא את ה-HH:MM
    // console.log(
    //   slotDate,
    //   availableData.available_date,
    //   "",
    //   slotStart,
    //   " ",
    //   availableData.start_time,
    //   "",
    //   slotEnd,
    //   "",
    //   availableData.end_time,
    // );

    return (
      slotDate === availableData.available_date &&
      slotStart <= availableData.start_time &&
      slotEnd >= availableData.end_time
    );
  });

  return (
    <>
      {(role === "Chief" || role === "Hall_Owner") && (
        <div className={classes.calendarContainer}>
          <div>
            <h2>Manage Your Availability</h2>
            <div className={classes.calendarWrapper}>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                selectable={true}
                editable={false}
                events={[...worksHour, ...events]}
                select={handleSelect}
                eventClick={handleEventClick} // ✨ חיבור הלחיצה על איוונטים ביומן
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
                      style={{
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        padding: "10px 15px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      disabled={loading}
                    >
                      {loading ? "Deleting..." : "🗑️ Delete Slot"}
                    </button>
                  )}

                  <button
                    onClick={() =>
                      setAvailableData({
                        available_date: "",
                        start_time: "",
                        end_time: "",
                      })
                    }
                    disabled={loading}
                    className={classes.cancelBtn}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* תצוגת אדמין ולקוח נשארות נקיות וקריאות בלבד */}
      {(role === "Admin" || role === "Customer") && (
        <div className={classes.calendarWrapper}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            selectable={role === "Customer"}
            editable={false}
            events={[...worksHour, ...events]}
            select={role === "Customer" ? handleSelect : null}
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="24:00:00"
            height="auto"
            headerToolbar={{
              start: "prev,next today",
              center: "title",
              end: "dayGridMonth,timeGridWeek",
            }}
          />
        </div>
      )}
    </>
  );
}
