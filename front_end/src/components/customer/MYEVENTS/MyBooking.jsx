import React from "react";
import classes from "./myBooking.module.css";
import { useEffect } from "react";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";


export default function MyBooking({ user }) {
  const navigate =useNavigate()
  const [eventData,setEventData]=useState()
  const [events, setEvents] = useState([]);
      let rolePath = user?.role.toLowerCase();
      if (rolePath === "chief" || rolePath === "hall_owner")
        rolePath = "provider";
      console.log(rolePath);

  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3030/${rolePath}/myEventsData`,
          {
            withCredentials: true,
          },
        );
        setEvents(response.data.data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchAllEvents();
  }, [user]);

  function update(e){
    navigate("/findavendor" , {
      state:{
        Event:e
      }
    });



  }

 const calculateDuration = (start, end) => {
   if (!start || !end) return 0;

   // הפיכת HH:MM למערך של מספרים
   const [startHours, startMinutes] = start.split(":").map(Number);
   const [endHours, endMinutes] = end.split(":").map(Number);

   const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  // חישוב ההפרש בשעות (דקות חלקי 60)
let diffInMinutes = endTotalMinutes - startTotalMinutes;

// טיפול במקרה של מעבר חצות (למשל מ-22:00 עד 02:00)
if (diffInMinutes < 0) {
  diffInMinutes += 24 * 60; // מוסיפים 1440 דקות
}

const durationInHours = diffInMinutes / 60;
  // החזרת מספר חיובי (למקרה שהזמנים הוזנו הפוך)
  return Math.max(0, durationInHours);
 };
  return (
    <div className={classes.event}>
      {/* {events.map((e) => (
        <div key={e.event_id}>
          <p className={classes[e.finalStatus.toLowerCase()]}>
            Status: {e.finalStatus}
          </p>
          <div>
            <p>Event Details</p>
            <strong>Date:</strong>
            <p>{e.requested_date}</p>
            <strong>Start Time:</strong>
            <p>{e.start_time}</p>
            <strong>End Time:</strong>
            <p>{e.end_time}</p>
            <strong>Guest Number:</strong>
            <p>{e.guest_number}</p>
            <strong>Hall Detail:</strong>
            <p>
              {e?.hall_name} & {e?.price} & {e?.status}
            </p>
            <strong>Chiefs Detail:</strong>
            <p>
              {e?.chief_name} & {e.price_per_hour} & {e?.chief_status}
            </p>
          </div>
          <button onClick={() => update(e)}>Update</button>
          <button>Cancel</button>
          <hr />
          {rolePath === "provider" && (
            <div>
              <button>Approve</button>
              <button>Reject</button>
            </div>
          )}
          {e.requested_date < new Date() &&
            e.status.toLowerCase() === "approved" && (
              <button>Write a Review</button>
            )}
        </div>
      ))} */}
      {events.map((e) => {
        // חישוב השעות עבור האירוע הנוכחי
        const hours = calculateDuration(e.start_time, e.end_time);
        const totalPrice = (e.price_per_hour * hours).toFixed(2); // עיגול ל-2 ספרות

        return (
          <div key={e.event_id} className={classes.eventCard}>
         <div key={e.event_id}>
          <p className={classes[e.finalStatus.toLowerCase()]}>
            Status: {e.finalStatus}
          </p>
          <div>
            <p>Event Details</p>
            <strong>Date:</strong>
            <p>{e.requested_date}</p>
            <strong>Start Time:</strong>
            <p>{e.start_time}</p>
            <strong>End Time:</strong>
            <p>{e.end_time}</p>
            <strong>Guest Number:</strong>
            <p>{e.guest_number}</p>
            <strong>Hall Detail:</strong>
            <p>
              {e?.hall_name} & {e?.price} & {e?.status}
            </p>
            <strong>Chiefs Detail:</strong>
            <p>
              {e?.chief_name} | {hours} hours | Total: ₪{totalPrice} | Status:{" "}
              {e?.chief_status}
            </p>
              <button onClick={() => update(e)}>Update</button>
          <button>Cancel</button>
          <hr />
          {rolePath === "provider" && (
            <div>
              <button>Approve</button>
              <button>Reject</button>
            </div>
          )}
          {e.requested_date < new Date() &&
            e.status.toLowerCase() === "approved" && (
              <button>Write a Review</button>
            )}
        </div>
        </div>
        </div>
        );
      })}
    </div>
  );
}
