import React from "react";
import ServiceCard from "../BasicToProviderProfile/ServiceCard";
import { useState, useEffect } from "react";
import axios from "axios";

export default function FavoriteProviders({ user }) {
  const [providers, setProviders] = useState([]);
  const [providersFavorite, setProvidersFavorite] = useState([]);

  async function fetchAllFavoriteProviders() {
    try {
      const response = await axios.get(
        "http://localhost:3030/customer/AllFavoritesProviders",
        { withCredentials: true },
      );

      const data = response.data.data; // הנתונים שהגיעו מה-SQL
      console.log(data);
      setProviders(data);

      // כאן התיקון: אנחנו מוציאים את ה-IDs ישירות מה-data שהגיע, לא מה-state
      setProvidersFavorite(data.map((p) => p.id));
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  }

  async function handleFavorite(provider) {
    console.log("aaaa", provider);
    const providerId = provider.id;
    console.log(providerId);
    try {
      if (providersFavorite.includes(provider.id)) {
        await axios.delete(
          `http://localhost:3030/customer/removeFavoriteProvider/${providerId}`,
          { withCredentials: true },
        );
      } else {
        await axios.post(
          "http://localhost:3030/customer/addFavoriteProvider",
          { providerId: providerId },
          { withCredentials: true },
        );
      }
      fetchAllFavoriteProviders();
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }
  useEffect(() => {
    fetchAllFavoriteProviders();
  }, []);
  return (
    <div>
      <h2>Favorite Providers</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        {providers.map((p) => (
          // שימי לב: החלפתי ל-() במקום {} כדי שה-return יהיה אוטומטי
          <ServiceCard
            key={p.id} // חשוב להוסיף key!
            user={user}
            provider={p}
            isFavorite={true} // בדף הזה כולם מועדפים
            handleFavorite={handleFavorite}
          />
        ))}
      </div>
    </div>
  );
}
