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
  const [events1,setEvents1]=useState([])
      let rolePath = user?.role.toLowerCase();
      if (rolePath === "chief" || rolePath === "hall_owner")
        rolePath = "provider";
      console.log(rolePath);

  // useEffect(() => {
  //   const fetchAllEvents = async () => {
  //     try {
  //       const response = await axios.get(
  //         `http://localhost:3030/${rolePath}/myEventsData`,
  //         {
  //           withCredentials: true,
  //         },
  //       );
  //       setEvents(response.data.data);
  //       events.map((e)=>{
  //         if(!events1.includes(e.event_id))
  //         {
  //            events1.chiefsId.push(e.chief_id)
  //             events1.push(e);
  //         }
  //         else
  //           events1.chiefsId.push(e.chief_id)
  //         setEvents1(([...prev , events1]))
  //       })

  //     } catch (error) {
  //       console.log(error);
  //     }
  //   };
  //   fetchAllEvents();
  // }, [user]);
  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3030/${rolePath}/myEventsData`,
          { withCredentials: true },
        );

        const rawData = response.data.data;

        // איחוד כפילויות בעזרת אובייקט (Map)
        const grouped = rawData.reduce((acc, current) => {
          const existingEvent = acc.find(
            (item) => item.event_id === current.event_id,
          );

          if (existingEvent) {
            // אם האירוע כבר קיים, רק נוסיף את השף לרשימה שלו
            if (!existingEvent.chiefs) existingEvent.chiefs = [];
            existingEvent.chiefs.push({
              id: current.chief_id,
              name: current.chief_name,
              status: current.chief_status,
              price: (
                calculateDuration(current.start_time, current.end_time) *
                current.price_per_hour
              ).toFixed(2),
            });
          } else {
            // אם זה אירוע חדש, ניצור אותו עם מערך שפים התחלתי
            acc.push({
              ...current,
              chiefs: [
                {
                  id: current.chief_id,
                  name: current.chief_name,
                  status: current.chief_status,
                  price: (
                    calculateDuration(current.start_time, current.end_time) *
                    current.price_per_hour
                  ).toFixed(2),
                },
              ],
            });
          }
          return acc;
        }, []);

        setEvents(grouped); // שומרים ב-State את המערך הנקי ללא כפילויות
      } catch (error) {
        console.log(error);
      }
    };
    fetchAllEvents();
  }, [user, rolePath]);

  function update(e){
    navigate("/findavendor" , {
      state:{
        Event:e,
        hallId:e.hall_id,
        ChiefIds:e.chief_id
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
   
      {events.map((e) => {
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
                {e.chiefs.map((chief) => (
                  <p key={chief.id}>
                    {chief.name} | Total: ₪{chief.price} | Status:{" "}
                    {chief.status}
                  </p>
                ))}
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
