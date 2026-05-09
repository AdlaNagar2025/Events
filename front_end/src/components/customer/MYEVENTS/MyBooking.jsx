import React from "react";
import classes from "./myBooking.module.css";
import { useEffect } from "react";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EventData from "../BOOKEVENT/EventData";


export default function MyBooking({ user }) {
  const navigate =useNavigate()
  const [eventData,setEventData]=useState()
  const [events, setEvents] = useState([]);
      let rolePath = user?.role.toLowerCase();
      if (rolePath === "chief" || rolePath === "hall_owner")
        rolePath = "provider";
      console.log(rolePath);
    const fetchAllEvents = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3030/${rolePath}/myEventsData`,
          { withCredentials: true },
        );

        const rawData = response.data.data;

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

  useEffect(() => {

    fetchAllEvents();
  }, [user, rolePath]);

  function update(e){
    navigate("/findavendor", {
      state: {
        Event: e,
        hallId: e.hall_id,
        ChiefIds: e.chiefs.map((c) => c.id),
      },
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

 async function  handlechangeStatus(eventId,status){
  try{
    const response = await axios.put(
      `http://localhost:3030/provider/changeEventStatus/${eventId}`,
      { status: status},
      { withCredentials: true },
    );
    console.log(response.data.data)
    fetchAllEvents()
  }
  catch(error)
  {console.log(error)}
 }

  return (
    <div className={classes.event}>
   
      {events.map((e) => {
        console.log( "hhhh" ,e)
        const hours = calculateDuration(e.start_time, e.end_time);
        const totalPrice = (e.price_per_hour * hours).toFixed(2); // עיגול ל-2 ספרות

        return (
          <div key={e.event_id} className={classes.eventCard}>
            <div key={e.event_id}>
              {rolePath === "customer" && (
                <p className={classes[e.finalStatus.toLowerCase()]}>
                  Status: {e.finalStatus}
                </p>
              )}
              {rolePath === "provider" && (
                <p className={classes[e.status.toLowerCase()]}>
                  Status: {e.status}
                </p>
              )}
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
                {rolePath !== "provider" && (
                  <div>
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
                  </div>
                )}
                {/* <div> */}
                {/* <EventData dataToEvent={e} hallData={e} chiefsData={e}/> */}
                {rolePath === "customer" && (
                  <div>
                    <button onClick={() => update(e)}>Update</button>{" "}
                    <button>Cancel</button>
                  </div>
                )}

                {rolePath === "provider" && (
                  <div>
                    <button
                      onClick={() => handlechangeStatus(e.event_id, "APPROVED")}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handlechangeStatus(e.event_id, "REJECTED")}
                    >
                      Reject
                    </button>
                  </div>
                )}
                <hr />
                {e.requested_date < new Date() && e.status === "APPROVED" && (
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
