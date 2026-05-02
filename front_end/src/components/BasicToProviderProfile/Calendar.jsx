import React, { useState, useEffect } from "react";
import classes from "./calendar.module.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

export default function Calendar({ role , user }) {
  const [availableData, setAvailableData] = useState({
    available_date: "",
    start_time: "",
    end_time: "",
    is_available: 1,
  });
  const [loading, setLoading] = useState(false); // הוספת סטייט לטעינה

  // State חדש לשמירת האירועים שיוצגו על היומן
  const [events, setEvents] = useState([]);

  // פונקציה למשיכת זמינות קיימת מהשרת
  const fetchAvailability = async () => {
    try {
       let url
      if (role === "Chief" || role === "Hall_Owner")
        url="http://localhost:3030/provider/getMyCalendar"
      else if (role === "Admin" )
        url=`http://localhost:3030/admin/ProviderCalendar/${user.id}`
      else if (role === "Customer" )
        url=`http://localhost:3030/customer/ProviderCalendar/${user.id}`

      const response = await axios.get(
url,        {
          withCredentials: true,
        },
      );
      if (response.data.success) {
        console.log("Data from DB:", response.data.data);
        const dataFromDB = response.data.data || [];
        const formattedEvents = dataFromDB.map((item) => {
          const d = new Date(item.available_date);

  // משתמשים בפונקציות Local שמחזירות את התאריך לפי שעון ישראל
  // גם אם השעה היא 21:00 ב-16 לחודש UTC, בישראל זה כבר ה-17!
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  
  const localDate = `${year}-${month}-${day}`;

  return {
    title: "Available",
    start: `${localDate}T${item.start_time}`,
    end: `${localDate}T${item.end_time}`,
    backgroundColor: "#28a745",
    borderColor: "#68c47e",
    allDay: false,
  };
});
        setEvents(formattedEvents);
      }
    } catch (error) {
      if (error.response) {
    console.error("Server Error Data:", error.response.data); // כאן תראי את ה-Message מהמידלוור
    console.error("Status Code:", error.response.status);
  } 
  // אם לא הייתה תשובה מהשרת בכלל (רשת כבויה)
  else if (error.request) {
    console.error("No response from server. Is the backend running?");
  } 
  // שגיאה אחרת (למשל טעות בקוד בתוך ה-try)
  else {
    console.error("Error setting up request:", error.message);
  }
  setEvents([]);
      console.error("Error fetching calendar:", error);
      setEvents([]);
    }
  };
  useEffect(() => {
    fetchAvailability();
  }, []);

  const handleSelect = (info) => {
    console.log(info);
    const start = info.start;
    const end = info.end;
    // בדיקה שלא נבחר זמן בעבר (כולל שעה!)
    if (start < new Date()) {
      alert("You cannot select a time in the past!");
      return;
    }

    // חילוץ תאריך ושעה בצורה נקייה
    const selectedDate = start.toISOString().split("T")[0];
    const startTime = start.toTimeString().substring(0, 5);
    const endTime = end.toTimeString().substring(0, 5);
    console.log(`${selectedDate} : ${startTime} : ${endTime}`);

    setAvailableData({
      available_date: selectedDate,
      start_time: startTime,
      end_time: endTime,
      is_available: 1,
    });
  };

  const handleSave = async () => {
    if (!availableData.available_date || !availableData.start_time) {
      alert("Please select a valid time slot first.");
      return;
    }
    setLoading(true);
    try {
     
      const response = await axios.post(
        "http://localhost:3030/provider/fillCalendar"
,
        availableData,
        { withCredentials: true },
      );
      if (response.data.success) {
        alert("Availability saved successfully! ✨");
        setAvailableData({
          available_date: "",
          start_time: "",
          end_time: "",
          is_available: 1,
        });
        fetchAvailability(); // רענון היומן כדי לראות את הבלוק הירוק החדש
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Calendar save error:", error);
      alert("Failed to save availability.");
    } finally {
      setLoading(false); // שחרור הכפתור
    }
  };

  return (
    <>
    {(role==="Chief" || role ==="Hall_Owner" ) && (
      <div className={classes.calendarContainer}>
      <h2>Manage Your Availability</h2>
      <div className={classes.calendarWrapper}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          selectable={true}
          editable={false}
          events={events}
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

      {availableData.available_date && (
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
            onClick={() =>
              setAvailableData({ ...availableData, available_date: "" })
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
    {role==="Admin" && (
      <div className={classes.calendarWrapper}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          editable={false}
          events={events}
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

      {role === "Customer"  && (
      <div className={classes.calendarWrapper}>
        <FullCalendar
     plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          selectable={true}
          editable={false}
          events={events}
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
