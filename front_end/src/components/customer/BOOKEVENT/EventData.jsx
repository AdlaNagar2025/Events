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
  console.log("I am in EVENTDATA", dataToEvent, "hhhhh");
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
                value={dataToEvent.notesToHall || notesToHall}
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

        {chiefsData?.length > 0 ? (
          <div className={classes.chefsBlock}>
            <p className={classes.blockTitle}>Selected Chefs &amp; Notes</p>
            {chiefsData.map((chief) => {
              // שליפת השף מתוך המערך dataToEvent.chiefs במידה וקיים
              const existingChefData = Array.isArray(dataToEvent?.chiefs)
                ? dataToEvent.chiefs.find((c) => c.chief_id === chief.chief_id)
                : null;

              // עדיפות: State מקומי -> הנתון שהגיע מה-DB -> מחרוזת ריקה
              const currentNote =
                noteToChef?.[chief.chief_id] ??
                existingChefData?.noteToChef ??
                "";

              return (
                <div key={chief.chief_id} className={classes.chefCard}>
                  <p className={classes.chefName}>
                    Chef {chief.first_name} {chief.last_name}
                  </p>
                  <div className={classes.inputGroup}>
                    <textarea
                      value={currentNote}
                      onChange={(e) =>
                        handleChefNoteChange(chief.chief_id, e.target.value)
                      }
                      placeholder={`Notes for Chef ${chief.first_name}...`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={classes.noChefs}>No chefs selected</p>
        )}
      </div>
    </div>
  );
}

//         {chiefsData.length > 0 ? (
//           <div className={classes.chefsBlock}>
//             <p className={classes.blockTitle}>Selected Chefs &amp; Notes</p>
//             {chiefsData.map((chief) => (
//               <div key={chief.chief_id} className={classes.chefCard}>
//                 <p className={classes.chefName}>
//                   Chef {chief.first_name} {chief.last_name}
//                 </p>
//                 <div className={classes.inputGroup}>
//                   <textarea
//                     value={
//                       dataToEvent.chiefs[chief.chief_id].noteToChef ||
//                       noteToChef[chief.chief_id] ||
//                       ""
//                     }
//                     onChange={(e) =>
//                       handleChefNoteChange(chief.chief_id, e.target.value)
//                     }
//                     placeholder={`Notes for Chef ${chief.first_name}...`}
//                   />
//                 </div>
//               </div>
//             ))}
//           </div>
//         ) : (
//           <p className={classes.noChefs}>No chefs selected</p>
//         )}
//       </div>
//     </div>
//   );
// }
