import React from 'react'
import classes from "./bookEvent.module.css";


export default function EventData({ dataToEvent  , hallData , chiefsData}) {
  return (
    <div className={classes.EventDetails}>
      <h2>Review Your Booking</h2>

      <div className={classes.infoSection}>
        <p>
          <strong>Date:</strong> {dataToEvent.requested_date}
        </p>
        <p>
          <strong>Start Time:</strong> {dataToEvent.start_time}
        </p>
        <p>
          <strong>End Time:</strong> {dataToEvent.end_time}
        </p>
        <p>
          <strong>Guests:</strong> {dataToEvent.guest_number}
        </p>
      </div>

      <hr />

      <h3>Your Selection</h3>
      <div className={classes.providersList}>
        <p>
          <strong>Venue:</strong>{" "}
          {hallData ? hallData.hall_name : "No venue selected"}
        </p>

        <div className={classes.chiefsBox}>
          <strong>Selected Chefs:</strong>
          {chiefsData.length > 0 ? (
            <ul>
              {chiefsData.map((chief) => (
                <li key={chief.id}>
                  {chief.first_name} {chief.last_name}
                </li>
              ))}
            </ul>
          ) : (
            <p>No chefs selected</p>
          )}
        </div>
      </div>
    </div>
  );
}
