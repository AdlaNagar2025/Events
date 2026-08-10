import { Link } from "react-router-dom";
import ServiceCard from "../shared/ServiceCard/ServiceCard";
import { useState, useEffect } from "react";
import API from "../../services/api";
import classes from "./favorites.module.css";

export default function FavoriteProviders({ user }) {
  const [providers, setProviders] = useState([]);
  const [providersFavorite, setProvidersFavorite] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchAllFavoriteProviders() {
    setLoading(true);
    try {
      const response = await API.get(
        "/customer/AllFavoritesProviders",
      );

      const data = response.data.data;
      setProviders(data);
      setProvidersFavorite(data.map((p) => p.id));
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFavorite(provider) {
    const providerId = provider.id;
    try {
      if (providersFavorite.includes(provider.id)) {
        await API.delete(
          `/customer/removeFavoriteProvider/${providerId}`,
          { withCredentials: true },
        );
      } else {
        await API.post(
          "/customer/addFavoriteProvider",
          { providerId: providerId },
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

  if (loading) {
    return (
      <div className={classes.page}>
        <div className={classes.loading}>
          <div className={classes.spinner} />
          Loading your favorites...
        </div>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <div className={classes.pageHeader}>
        <div className={classes.headerContent}>
          <div className={classes.headerText}>
            <h1>Favorite Providers</h1>
            <p>Your saved vendors for quick access</p>
          </div>
          {providers.length > 0 && (
            <div className={classes.countBadge}>
              <span className={classes.countIcon}>❤️</span>
              <div>
                <div className={classes.countNumber}>{providers.length}</div>
                <div className={classes.countLabel}>Saved</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {providers.length === 0 ? (
        <div className={classes.emptyState}>
          <div className={classes.emptyIcon}>♡</div>
          <p className={classes.emptyTitle}>No favorites yet</p>
          <p className={classes.emptyText}>
            Browse vendors and tap the heart icon to save your favorites here.
          </p>
          <Link to="/customer/find-vendor" className={classes.emptyBtn}>
            Find a Vendor
          </Link>
        </div>
      ) : (
        <>
          <div className={classes.toolbar}>
            <span className={classes.toolbarText}>
              Showing <strong>{providers.length}</strong> saved provider
              {providers.length !== 1 ? "s" : ""}
            </span>
            <Link to="/customer/find-vendor" className={classes.findLink}>
              + Find More
            </Link>
          </div>

          <div className={classes.grid}>
            {providers.map((p) => (
              <div key={p.id} className={classes.cardWrap}>
                <ServiceCard
                  user={user}
                  provider={p}
                  isFavorite={true}
                  handleFavorite={handleFavorite}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
