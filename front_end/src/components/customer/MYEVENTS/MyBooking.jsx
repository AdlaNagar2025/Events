import React from "react";
import classes from "./myBooking.module.css";
import { useEffect } from "react";
import axios from "axios";
import { useState } from "react";

export default function MyBooking() {
  const [events, setEvents] = useState([]);
  console.log("MY BOOKING");
  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3030/customer/myEventsData",
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
  }, []);

  return (
    <div className={classes.event}>
      {events.map((e) => (
        <div>
          <p>status:{e.status.toLowerCase()}</p>

          <div>
            <p>Event Details</p>
            <p>{e.requested_date}</p>
            <p>{e.start_time}</p>
            <p>{e.end_time}</p>
            <p>{e.guest_number}</p>
          </div>

          <button>Update</button>
          <button>Cancel</button>
          {e.requested_date < new Date() && e.status.toLowerCase() ==="approved"  &&  <button>Write a Review</button>}
        </div>
      ))}
    </div>
  );
}
