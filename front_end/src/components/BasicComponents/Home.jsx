import classes from "./home.module.css";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  function handleClick() {
    navigate("/auth/login");
  }

  return (
    <section className={classes.page}>
      <main className={classes.main}>
        <div className={classes.hero}>
          <span className={classes.badge}>Your Event, Perfectly Planned</span>
          <h1>
            Welcome to <span className={classes.brand}>EventHub</span>
          </h1>
          <p className={classes.tagline}>
            One solution for planning your perfect event
          </p>
          <p className={classes.mdiv}>
            Discover, manage and connect with event professionals in one place.
            The online platform linking clients to professional suppliers.
          </p>
          <button type="button" className={classes.start} onClick={handleClick}>
            Start Planning Your Event
          </button>
        </div>

        <div className={classes.container}>
          <h2 className={classes.sectionTitle}>Who Is It For?</h2>
          <div className={classes.mid}>
            <div className={classes.infoCard}>
              <span className={classes.cardIcon}>👤</span>
              <p>For Clients</p>
              <ul>
                <li>Search trusted suppliers</li>
                <li>Book halls &amp; catering</li>
                <li>Manage your events</li>
              </ul>
            </div>

            <div className={classes.infoCard}>
              <span className={classes.cardIcon}>🏢</span>
              <p>For Suppliers</p>
              <ul>
                <li>Grow your business</li>
                <li>Showcase your work</li>
                <li>Manage bookings</li>
              </ul>
            </div>

            <div className={classes.infoCard}>
              <span className={classes.cardIcon}>✨</span>
              <p>How It Works</p>
              <ul>
                <li>Search &amp; compare vendors</li>
                <li>Book your dream team</li>
                <li>Enjoy your perfect day</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}
