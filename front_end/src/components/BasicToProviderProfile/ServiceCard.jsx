import { useState, useEffect } from "react";
import classes from "./serviceCard.module.css"; // בואי נוסיף עיצוב בהמשך
import axios from "axios";
import { useNavigate } from "react-router-dom";
import BusinessProfile from "../CommonComponents/BusinessProfile";
import { MdOutlineFavoriteBorder } from "react-icons/md";
import { MdFavorite } from "react-icons/md";

export default function ServiceCard({
  user,
  provider,
  isFavorite,
  handleFavorite,
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [cardData, setCardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCardData = async () => {
      try {
        setIsLoading(true);
        const rolePath = user.role.toLowerCase();
        const url = `http://localhost:3030/${rolePath}/CardData/${provider.id}`;
        const response = await axios.get(url, { withCredentials: true });

        if (response.data.success) {
          setCardData(response.data.data);
        }
      } catch (error) {
        console.error("Error loading card:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (provider?.id) fetchCardData();
  }, [provider.id, provider.role, provider.provider_type]);

  if (isLoading) return <div className={classes.cardLoader}>loading...</div>;

  return (
    <>
      {/* שכבת המודל - מוצגת רק כש-showProfile אמת */}
      {showProfile && (
        <div
          className={classes.modalOverlay}
          onClick={() => setShowProfile(false)}
        >
          <div
            className={classes.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={classes.closeBtn}
              onClick={() => setShowProfile(false)}
            >
              &times;
            </button>

            <div className={classes.modalBody}>
              <BusinessProfile user={user} provider={provider} />
            </div>
          </div>
        </div>
      )}

      <div className={classes.card}>
        {!isFavorite ? (
          <MdOutlineFavoriteBorder onClick={() => handleFavorite(provider)} />
        ) : (
          <MdFavorite color="red" onClick={() => handleFavorite(provider)} />
        )}

        <div className={classes.imageSection}>
          {cardData?.main_image ? (
            <img
              src={`http://localhost:3030/uploads/${cardData.main_image}`}
              alt="Business"
            />
          ) : (
            <div className={classes.noImage}>No images</div>
          )}
        </div>

        <div className={classes.content}>
          <h3>
            {provider.first_name} {provider.last_name}
          </h3>
          <div className={classes.ratingSection}>
            <span className={classes.stars}>⭐ {cardData?.avgRating}</span>
            <span className={classes.reviewCount}>
              ({cardData?.totalReviews} reviews)
            </span>
          </div>
          <p className={classes.roleBadge}>{provider.role}</p>

          <div className={classes.details}>
            <span>📍 {cardData?.city || "  "}</span>
            <br />
            <span>
              💰
              {cardData?.display_price ? `${cardData.display_price} ₪` : ""}
            </span>
          </div>

          <div className={classes.actions}>
            <button
              onClick={() => setShowProfile(true)}
              className={classes.detailsBtn}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
