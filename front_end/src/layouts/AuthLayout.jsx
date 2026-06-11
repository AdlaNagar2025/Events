import { Outlet } from "react-router-dom";
import styles from "./authLayout.module.css";

export default function AuthLayout() {
  return (
    <div className={styles.authPage}>
      <div className={styles.authBackdrop} />
      <div className={styles.authContent}>
        <div className={styles.brandPanel}>
          <h1 className={styles.brandLogo}>
            Event<span>Hub</span>
          </h1>
          <p className={styles.brandTagline}>
            One solution for planning your perfect event. Connect with vendors,
            manage bookings, and celebrate with ease.
          </p>
          <ul className={styles.brandFeatures}>
            <li>Find trusted event vendors</li>
            <li>Book halls &amp; catering in one place</li>
            <li>Manage your events effortlessly</li>
          </ul>
        </div>
        <div className={styles.formPanel}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
