import Review from "../customer/Review";
import classes from "../customer/review.module.css";

// הוספנו onClose כאן בארגומנטים של הפונקציה
export default function ReviewSection({ event, onClose }) {
  console.log("REVIEW SECTIONNNNN", event);

  const providers = [
    ...(event.hall_id ? [{ id: event.hall_id, name: event.hall_name }] : []),
    ...(event.chiefs
      ? event.chiefs.map((c) => ({ id: c.id, name: c.name }))
      : []),
  ];

  return (
    <div className={classes.modalBackdrop}>
      <div className={classes.reviewModal}>
        {/* כפתור X לסגירת המודל */}
        <button className={classes.closeModalBtn} onClick={onClose}>
          &times;
        </button>

        <h3>Leave a Review</h3>

        <div className={classes.providersContainer}>
          {providers.map((p) => (
            <Review key={p.id} provider={p} eventId={event.event_id} />
          ))}
        </div>
      </div>
    </div>
  );
}
