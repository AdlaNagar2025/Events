import Review from "../customer/Review";
import classes from "../customer/review.module.css";
export default function ReviewSection({ event }) {
  const providers = [
    ...(event.hall_id ? [{ id: event.hall_id, name: event.hall_name }] : []),
    ...event.chiefs.map((c) => ({ id: c.id, name: c.name })),
  ];

  return (
    <div className={classes.reviewSection}>
      <h4>Leave a Review</h4>
      {providers.map((p) => (
        <Review key={p.id} provider={p} eventId={event.event_id} />
      ))}
    </div>
  );
}
