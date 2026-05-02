import { useState, useEffect } from "react";
import classes from "./serviceCard.module.css"; // בואי נוסיף עיצוב בהמשך
import axios from "axios";
import { useNavigate } from "react-router-dom";
import BusinessProfile from "../CommonComponents/BusinessProfile";

export default function ServiceCard({ user, provider, searchParams }) {
  const [showProfile, setShowProfile] = useState(false);
  const [cardData, setCardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
    const [isChecked, setIsChecked] = useState(false);

    const handleOnChange = () => {
      setIsChecked(!isChecked);
    };

  const navigate = useNavigate();

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

  function handleSelectProvider() {
    navigate("/bookEvent", {
      state: {
        dataToEvent: searchParams,
        selectedProvider: { ...provider, ...cardData },
      },
    });
  }

  if (isLoading) return <div className={classes.cardLoader}>טוען...</div>;
  // if (showProfile) return <BusinessProfile user={user} provider={provider} />;

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

      {/* הכרטיס המקורי שלך */}
      <div className={classes.card}>
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

        

            {user?.role !== "Admin" && (
              // <checkBox
              //   onClick={handleSelectProvider}
              //   className={classes.selectBtn}
              // >
              //   select
              // </checkBox>
                  <label>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={handleOnChange}
      />
      select
    </label>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
