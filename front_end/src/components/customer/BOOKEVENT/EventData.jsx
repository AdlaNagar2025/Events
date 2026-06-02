import React from "react";
import classes from "./bookEvent.module.css";
import CitySelect from "../../provider/CitySelect";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function EventData({
  dataToEvent,
  hallData,
  chiefsData,
  eventLocation,
  setEventLocation,
  notesToHall,
  setNotesToHall,
  noteToChef,
  setNoteToChef,
  hallId,
  handleChefNoteChange, // הפונקציה שמתקבלת מהאב
}) {

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

      <h3>Your Selection & Location Setup</h3>
      <div className={classes.providersList}>
        {/* חוק עסקי: אם יש אולם, הוא המיקום. אם אין, מציגים בחירת עיר */}
        {hallData ? (
          <div style={{ marginBottom: "20px" }}>
            <p>
              <strong>Venue:</strong> {hallData.hall_name}
            </p>

            <div className={classes.inputGroup}>
              <label>Notes for the Hall:</label>
              <textarea
                value={notesToHall}
                onChange={(e) => setNotesToHall(e.target.value)}
                placeholder="Any special requests for the venue?..."
              />
            </div>
          </div>
        ) : null}

        {/* אם אין אולם ויש שפים - חובה לבצע בחירת מיקום לאירוע */}
        {!hallId && chiefsData.length > 0 && (
          <div style={{ marginTop: "15px", marginBottom: "20px" }}>
            <label
              style={{
                fontWeight: "bold",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Event Location (Where should the chefs arrive?):
            </label>
            <CitySelect
              selectedCity={eventLocation}
              onCityChange={(cityName) => setEventLocation(cityName)}
            />
          </div>
        )}

        {/* הצגת השפים ותיבות הטקסט האישיות שלהם */}
        {chiefsData.length > 0 ? (
          <div style={{ marginTop: "20px" }}>
            <strong>Selected Chefs & Personal Notes:</strong>
            <div style={{ marginTop: "10px" }}>
              {chiefsData.map((chief) => (
                <div
                  key={chief.id}
                  style={{
                    marginBottom: "15px",
                    padding: "10px",
                    border: "1px solid #eee",
                    borderRadius: "5px",
                  }}
                >
                  {/* שם השף */}
                  <p style={{ fontWeight: "bold", margin: "0 0 8px 0" }}>
                    Chef: {chief.first_name} {chief.last_name}
                  </p>

                  {/* תיבת טקסט ייחודית לשף הזה */}
                  <div className={classes.inputGroup}>
                    <textarea
                      value={noteToChef[chief.id] || ""}
                      onChange={(e) =>
                        handleChefNoteChange(chief.id, e.target.value)
                      } // תוקן לשם הפונקציה שמתקבלת מה-Props
                      placeholder={`Write specific notes for Chef ${chief.first_name}...`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p>No chefs selected</p>
        )}
      </div>
    </div>
  );
}
