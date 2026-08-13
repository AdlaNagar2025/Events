import classes from "./BusinessProfile.module.css";
import React, { useEffect, useState } from "react";
import API from "../../../services/api";
import ImageUpload from "../../provider/ImageGallery/ImageUpload";
import Calendar from "../../provider/Calander/Calendar";
import CommentsAndReviews from "../CommentsAndReviews";

export default function BusinessProfile({
  user,
  provider,
  profile: initialProfile,
}) {
  const [profile, setProfile] = useState(initialProfile || null);
  const [loading, setLoading] = useState(!initialProfile);

  const providerId = provider?.id || provider?.chief_id || provider?.hall_id;

  useEffect(() => {
    // אם כבר קיבלנו profile מוכן, אין צורך לקרוא לשרת שוב
    if (initialProfile) {
      setProfile(initialProfile);
      setLoading(false);
      return;
    }

    if (!providerId) return;

    const fetchFullProfile = async () => {
      try {
        setLoading(true);
        const rolePath = (user?.role || "customer").toLowerCase();
        const response = await API.get(
          `/${rolePath}/provider-details/${providerId}`,
        );

        if (response.data.success) {
          setProfile(response.data.data);
        }
      } catch (error) {
        console.error("Error loading profile details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFullProfile();
  }, [providerId, user?.role, initialProfile]);

  if (loading) {
    return (
      <div className={classes.emptyState}>Loading business details...</div>
    );
  }

  if (!profile) {
    return (
      <div className={classes.emptyState}>No data found for this business.</div>
    );
  }

  const roleLabel =
    profile.role === "Hall_Owner" || provider?.provider_type === "Hall_Owner"
      ? "Venue"
      : profile.role === "Chief" || provider?.provider_type === "Chief"
        ? "Catering"
        : "Provider";

  return (
    <div className={classes.container}>
      <header className={classes.header}>
        <h2>
          {profile.displayName || profile.hall_name || profile.first_name}
        </h2>
        <span className={classes.badge}>{roleLabel}</span>
      </header>

      <div className={classes.detailsGrid}>
        <div className={classes.infoItem}>
          <strong>Location</strong>
          {[profile.city, profile.street].filter(Boolean).join(", ") || "—"}
        </div>

        <div className={classes.infoItem}>
          <strong>Capacity</strong>
          {profile.capacity ? `${profile.capacity} people` : "—"}
        </div>

        <div className={classes.infoItem}>
          <strong>Contact</strong>
          {profile.phone || profile.email || provider?.email || "—"}
        </div>

        {profile.role === "Chief" || provider?.provider_type === "Chief" ? (
          <>
            <div className={classes.infoItem}>
              <strong>Specialty</strong>
              {profile.specialty || "—"}
            </div>
            <div className={classes.infoItem}>
              <strong>Experience</strong>
              {profile.experience_years === 0
                ? "Fresh Talent"
                : profile.experience_years
                  ? `${profile.experience_years} years`
                  : "—"}
            </div>
            <div className={classes.infoItem}>
              <strong>Hourly Rate</strong>
              {profile.display_price ? `₪${profile.display_price}` : "—"}
            </div>
          </>
        ) : (
          <div className={classes.infoItem}>
            <strong>Price</strong>
            {profile.display_price ? `₪${profile.display_price}` : "—"}
          </div>
        )}
      </div>

      <div className={classes.description}>
        <h3>About the Business</h3>
        <p>{profile.description || "No description provided."}</p>
      </div>

      <hr className={classes.divider} />

      <section className={classes.mediaSection}>
        <ImageUpload role={user?.role} provider={provider} />
      </section>

      <section className={classes.calendarSection}>
        <Calendar role={user?.role} user={provider} />
      </section>

      <section className={classes.calendarSection}>
        <CommentsAndReviews role={user?.role} user={provider} />
      </section>
    </div>
  );
}
