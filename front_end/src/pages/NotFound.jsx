import { Link } from "react-router-dom";
import classes from "./notFound.module.css";

export default function NotFound() {
  return (
    <div className={classes.page}>
      <div className={classes.backdrop} />
      <div className={classes.card}>
        <span className={classes.code}>404</span>
        <h1 className={classes.title}>Page Not Found</h1>
        <p className={classes.message}>
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved. Check the URL or head back to the homepage.
        </p>
        <div className={classes.actions}>
          <Link to="/" className={classes.primaryBtn}>
            Go to Homepage
          </Link>
          <Link to="/auth/login" className={classes.secondaryBtn}>
            Sign In
          </Link>
        </div>
        <p className={classes.brand}>
          Event<span>Hub</span>
        </p>
      </div>
    </div>
  );
}
