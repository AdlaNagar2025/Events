import React from "react";
import classes from "./myBooking.module.css";
import { useEffect } from "react";
import axios from "axios";
import { useState } from "react";

export default function MyBooking({user}) {
  console.log("Iam in MyBooking",user)
  const [events, setEvents] = useState([]);
  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
          let rolePath = user?.role.toLowerCase();
          if (rolePath === "chief" || rolePath === "hall_owner")
            rolePath = "provider";
          console.log(rolePath);
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

  return (
    <div className={classes.event}>
      {events.map((e) => (
        <div key={e.event_id}>
          <p>status:{e.status.toLowerCase()}</p>

          <div>
            <p>Event Details</p>
            <p>{e.requested_date}</p>
            <p>{e.start_time}</p>
            <p>{e.end_time}</p>
            <p>{e.guest_number}</p>
            {/* <p></p> */}
          </div>

          <button>Update</button>
          <button>Cancel</button>
          {e.requested_date < new Date() &&
            e.status.toLowerCase() === "approved" && (
              <button>Write a Review</button>
            )}
        </div>
      ))}
    </div>
  );
}
