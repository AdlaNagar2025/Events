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

  // משתנה עזר שמחזיר את תאריך היום בפורמט YYYY-MM-DD המותאם ל-HTML אינפוט
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // פונקציה מרוכזת לבדיקת תקינות הזמנים (ולידציה)
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
          return {
            title: "🟢 Available",
            start: `${localDate}T${item.start_time}`,
            end: `${localDate}T${item.end_time}`,
            backgroundColor: "#28a745",
            borderColor: "#68c47e",
            allDay: false,
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

  // בחירה ישירה באמצעות גרירה/קליק על לוח השנה
  const handleSelect = (info) => {
    const selectedDate = info.start.toISOString().split("T")[0];
    const startTime = info.start.toTimeString().substring(0, 5);
    const endTime = info.end.toTimeString().substring(0, 5);

    // ביצוע הולידציה המרכזית
    if (!validateTimes(selectedDate, startTime, endTime)) return;

    setAvailableData({
      available_date: selectedDate,
      start_time: startTime,
      end_time: endTime,
    });
  };

  // שינוי ידני דרך תיבות ה-Input
  function handleChange(e) {
    const { name, value } = e.target;
    setAvailableData((prev) => {
      const updatedData = { ...prev, [name]: value };
      return updatedData;
    });
  }

  // שמירה לשרת
  const handleSave = async () => {
    const { available_date, start_time, end_time } = availableData;
    if (!available_date || !start_time || !end_time) {
      alert("Please select a valid time slot first.");
      return;
    }
    // ולידציה סופית רגע לפני השליחה (מגן מפני שינויים ידניים אסורים באינפוטים)
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
      // מציג את השגיאה המדויקת מה-Backend במידה והולידציה שם נכשלה
      const errorMsg =
        error.response?.data?.message || "Failed to save availability.";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const { available_date, start_time, end_time } = availableData;
    if (!available_date || !start_time || !end_time) {
      alert("Please select a valid time slot first.");
      return;
    }
    // ולידציה סופית רגע לפני השליחה (מגן מפני שינויים ידניים אסורים באינפוטים)
    if (!validateTimes(available_date, start_time, end_time)) return;
    setLoading(true);
    try {
      const response = await axios.delete(
        "http://localhost:3030/provider/updateCalendar",
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
      // מציג את השגיאה המדויקת מה-Backend במידה והולידציה שם נכשלה
      const errorMsg =
        error.response?.data?.message || "Failed to save availability.";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
                min={getTodayString()} // ✨ תיקון: חסימת תאריכי עבר באינפוט עצמו בצורה נכונה
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
                <h4>Confirm New Slot:</h4>
                <p>📅 {availableData.available_date}</p>
                <p>
                  ⏰ {availableData.start_time} - {availableData.end_time}
                </p>
                <button
                  onClick={handleSave}
                  className={classes.saveBtn}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Slot"}
                </button>
                <button
                  onClick={handleDelete}
                  className={classes.deleteBtn} // תוכלי לעצב אותו באדום ב-CSS שלך
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
            )}
        </div>
      )}

      {role === "Admin" && (
        <div className={classes.calendarWrapper}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            editable={false}
            events={[...worksHour, ...events]}
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

      {role === "Customer" && (
        <div className={classes.calendarWrapper}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            selectable={true}
            editable={false}
            events={[...worksHour, ...events]}
            select={handleSelect}
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
