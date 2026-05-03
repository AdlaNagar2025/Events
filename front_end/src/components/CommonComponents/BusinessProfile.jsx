import classes from "./BusinessProfile.module.css";
import React from "react";
import axios from "axios";
import { useState, useEffect } from "react";
import ImageUpload from "../BasicToProviderProfile/ImagesCode/ImageUpload";
import Calendar from "../BasicToProviderProfile/Calendar/Calendar";

export default function BusinessProfile({ user, provider }) {
  console.log(provider);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      console.log("I AM IN BUSINESSPROFILE LINE 15" + user?.role);
      try {
        const rolePath = user.role.toLowerCase();
        const url = `http://localhost:3030/${rolePath}/Profile/${provider.id}`;

        const response = await axios.get(url, { withCredentials: true });
        setData(response.data.data);
        console.log("I am in BusinessProfile Componenta ", response.data.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchProfile();
  }, [provider.id, user?.role]);
  if (loading) return <div className={classes.loader}>Loading Profile...</div>;
  if (!data) return <div>No data found for this business.</div>;
  return (
    <div className={classes.container}>
      <header className={classes.header}>
        <h2>{data.hall_name || provider.first_name}</h2>
        <span className={classes.badge}>
          {provider.provider_type.replace("_", " ")}
        </span>
      </header>

      <div className={classes.detailsGrid}>
        {/* פרטים כלליים שקיימים בשני הסוגים */}
        <div className={classes.infoItem}>
          <strong>Location:</strong> {data.city}, {data.street}
        </div>
        <div className={classes.infoItem}>
          <strong>Capacity:</strong> {data.capacity} people
        </div>
        <div className={classes.infoItem}>
          <strong>Contact:</strong> {data.phone || data.email || provider.email}
        </div>

        {/* פרטים ספציפיים לפי סוג */}
        {provider.provider_type === "Chief" ? (
          <>
            <div className={classes.infoItem}>
              <strong>Specialty:</strong> {data.specialty}
            </div>
            <div className={classes.infoItem}>
              <strong>Experience:</strong>{" "}
              {data.experience_years === 0
                ? "Fresh Talent"
                : `${data.experience_years} years`}
            </div>
            <div className={classes.infoItem}>
              <strong>Hourly Rate:</strong> ₪{data.price_per_hour}
            </div>
          </>
        ) : (
          <div className={classes.infoItem}>
            <strong>Price:</strong> ₪{data.price}
          </div>
        )}
      </div>

      <div className={classes.description}>
        <h3>About the Business</h3>
        <p>{data.description}</p>
      </div>

      <hr className={classes.divider} />

      <section className={classes.mediaSection}>
        <ImageUpload role={user?.role} provider={provider} />
      </section>

      <section className={classes.calendarSection}>
        <Calendar role={user?.role} user={provider} />
      </section>
    </div>
  );
}
