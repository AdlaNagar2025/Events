import { useState, useEffect } from "react";
import classes from "./serviceCard.module.css";
import API from "../../../services/api";
import BusinessProfile from "../BusinessProfile/BusinessProfile";
import { MdOutlineFavoriteBorder } from "react-icons/md";
import { MdFavorite } from "react-icons/md";

const UPLOADS_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/uploads/`;

export default function ServiceCard({
  user,
  provider,
  isFavorite,
  handleFavorite,
  isSelected,
  onSelect,
  isDateAndTimeSelected,
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [cardData, setCardData] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

  const displayName =
    provider?.ServiceName ||
    [provider?.first_name, provider?.last_name].filter(Boolean).join(" ");

  const roleLabel =
    provider?.provider_type === "Hall_Owner"
      ? "Venue"
      : provider?.provider_type === "Chief"
        ? "Catering"
        : provider?.role || "Provider";

  const avgRating = cardData?.avgRating ?? provider?.avgRating;
  const totalReviews = cardData?.totalReviews ?? provider?.totalReviews ?? 0;

  useEffect(() => {
    if (!provider?.id) {
      setImageLoading(false);
      return;
    }

    let cancelled = false;

    const fetchCardData = async () => {
      try {
        setImageLoading(true);
        const rolePath = (user?.role || "customer").toLowerCase();
        const url = `/${rolePath}/provider-details/${provider.id}`;
        const response = await API.get(url);

        if (!cancelled && response.data.success) {
          setCardData(response.data.data);
        }
      } catch (error) {
        console.error("Error loading card:", error);
      } finally {
        if (!cancelled) {
          setImageLoading(false);
        }
      }
    };

    fetchCardData();

    return () => {
      cancelled = true;
    };
  }, [provider?.id, user?.role]);

  if (!provider?.id) {
    return null;
  }

  return (
    <>
      {showProfile && (
        <div
          className={classes.modalOverlay}
          onClick={() => setShowProfile(false)}
        >
          <div
            className={classes.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={classes.modalHeader}>
              <div className={classes.modalHeaderText}>
                <span className={classes.modalEyebrow}>{roleLabel}</span>
                <h2 className={classes.modalTitle}>{displayName}</h2>
              </div>
              <button
                type="button"
                className={classes.closeBtn}
                onClick={() => setShowProfile(false)}
                aria-label="Close details"
              >
                &times;
              </button>
            </div>

            <div className={classes.modalBody}>
              <BusinessProfile
                user={user}
                provider={provider}
                profile={cardData}
              />
            </div>
          </div>
        </div>
      )}

      <div className={classes.card}>
        <button
          type="button"
          className={`${classes.favBtn} ${isFavorite ? classes.favBtnActive : ""}`}
          onClick={() => handleFavorite(provider)}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? <MdFavorite /> : <MdOutlineFavoriteBorder />}
        </button>

        <div className={classes.imageSection}>
          {imageLoading ? (
            <div className={classes.noImage}>Loading image...</div>
          ) : cardData?.main_image ? (
            <img
              src={`${UPLOADS_BASE_URL}${cardData.main_image}`}
              alt={displayName}
            />
          ) : (
            <div className={classes.noImage}>No images</div>
          )}
        </div>

        <div className={classes.content}>
          <h3>{displayName}</h3>
          <div className={classes.ratingSection}>
            <span className={classes.stars}>
              {Number(totalReviews) > 0 && (
                <span>
                  {avgRating} ⭐ ({totalReviews} reviews)
                </span>
              )}
            </span>
          </div>
          <span className={classes.roleBadge}>{roleLabel}</span>

          <div className={classes.details}>
            <span>📍 {cardData?.city || "—"}</span>
            <br />
            <span>
              💰
              {cardData?.display_price ? `${cardData.display_price} ₪` : "—"}
            </span>
          </div>

          <div className={classes.actions}>
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className={classes.detailsBtn}
            >
              <span>View Details</span>
              <span className={classes.detailsBtnArrow} aria-hidden="true">
                →
              </span>
            </button>

            {/* 🎯 כפתור בחירת הספק לאירוע */}
            {/* 🎯 כפתור בחירת הספק לאירוע */}
            {onSelect && (
              <div>
                <button
                  type="button"
                  disabled={!isDateAndTimeSelected}
                  onClick={() => onSelect(provider.id)}
                  style={{
                    backgroundColor: !isDateAndTimeSelected
                      ? "#ccc" // צבע אפור כשהוא חסום
                      : isSelected
                        ? "#2e7d32"
                        : "#1976d2",
                    color: !isDateAndTimeSelected ? "#666" : "white",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: !isDateAndTimeSelected ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    marginTop: "8px",
                    width: "100%",
                    transition: "all 0.2s ease",
                  }}
                >
                  {!isDateAndTimeSelected
                    ? "🔒 Select Date & Guests First"
                    : provider.provider_type === "Hall_Owner"
                      ? isSelected
                        ? "✔️ Venue Selected"
                        : "🏛️ Select as Venue"
                      : isSelected
                        ? "➖ Remove Chef"
                        : "➕ Add Chef"}
                </button>
              </div>
            )}
          </div>

          {/* <div className={classes.actions}>
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className={classes.detailsBtn}
            >
              <span>View Details</span>
              <span className={classes.detailsBtnArrow} aria-hidden="true">
                →
              </span>
            </button>
          </div> */}
        </div>
      </div>
    </>
  );
}
