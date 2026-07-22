import classes from "./bookEvent.module.css";
import CitySelect from "../../shared/CitySelect";

export default function EventData({
  dataToEvent,
  hallData,
  chiefsData,
  eventLocation,
  setEventLocation,
  notesToHall,
  setNotesToHall,
  noteToChef,
  hallId,
  handleChefNoteChange,
}) {
  return (
    <div className={classes.EventDetails}>
      <h2>Review Your Booking</h2>

      <div className={classes.infoSection}>
        <div className={classes.infoItem}>
          <strong>Date</strong>
          <span>{dataToEvent.requested_date}</span>
        </div>
        <div className={classes.infoItem}>
          <strong>Start Time</strong>
          <span>{dataToEvent.start_time}</span>
        </div>
        <div className={classes.infoItem}>
          <strong>End Time</strong>
          <span>{dataToEvent.end_time}</span>
        </div>
        <div className={classes.infoItem}>
          <strong>Guests</strong>
          <span>{dataToEvent.guest_number}</span>
        </div>
      </div>

      <hr className={classes.divider} />

      <h3>Your Selection &amp; Location</h3>
      <div className={classes.providersList}>
        {hallData && (
          <div className={classes.venueBlock}>
            <p>
              <strong>Venue:</strong> {hallData.hall_name}
            </p>
            <div className={classes.inputGroup}>
              <label>Notes for the Hall</label>
              <textarea
                value={notesToHall}
                onChange={(e) => setNotesToHall(e.target.value)}
                placeholder="Any special requests for the venue?"
              />
            </div>
          </div>
        )}

        {!hallId && chiefsData.length > 0 && (
          <div className={classes.locationBlock}>
            <label>Event Location (where should the chefs arrive?)</label>
            <CitySelect
              selectedCity={eventLocation}
              onCityChange={(cityName) => setEventLocation(cityName)}
            />
          </div>
        )}

        {chiefsData.length > 0 ? (
          <div className={classes.chefsBlock}>
            <p className={classes.blockTitle}>Selected Chefs &amp; Notes</p>
            {chiefsData.map((chief) => (
              <div key={chief.id} className={classes.chefCard}>
                <p className={classes.chefName}>
                  Chef {chief.first_name} {chief.last_name}
                </p>
                <div className={classes.inputGroup}>
                  <textarea
                    value={noteToChef[chief.id] || ""}
                    onChange={(e) =>
                      handleChefNoteChange(chief.id, e.target.value)
                    }
                    placeholder={`Notes for Chef ${chief.first_name}...`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={classes.noChefs}>No chefs selected</p>
        )}
      </div>
    </div>
  );
}
