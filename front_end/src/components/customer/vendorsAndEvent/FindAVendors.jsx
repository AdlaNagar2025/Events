import React, { useEffect, useState } from "react";
import EventSummaryBar from "./EventSummaryBar";
import SearchFilters from "./SearchFilters";
import ServiceCard from "../../shared/ServiceCard/ServiceCard";
import API from "../../../services/api";
import { validateSearchParams } from "../../../utils/validation"; // 👈 ייבוא פונקציית הולדיציה
import { useNavigate, useLocation } from "react-router-dom";

export default function FindAVendors({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, setSearchParams] = useState({
    requested_date: "",
    start_time: "",
    end_time: "",
    guest_number: "",
    city: "",
    price: "",
  });

  const [selectedHallId, setSelectedHallId] = useState(null);
  const [selectedChiefIds, setSelectedChiefIds] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [providersFavorite, setProvidersFavorite] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const hasSearchParams = Object.values(searchParams).some(
    (val) => val !== "" && val !== null && val !== undefined,
  );

  const isDateAndTimeSelected = Boolean(
    searchParams.requested_date &&
    searchParams.start_time &&
    searchParams.end_time &&
    searchParams.guest_number,
  );

  const handleSearch = async () => {
    // 🔍 בדיקת תקינות הקלטים לפני פנייה לשרת
    const errorMessage = validateSearchParams(searchParams);
    if (errorMessage) {
      setValidationError(errorMessage); // מציגים את השגיאה במסך
      setProviders([]); // 🛑 מרוקנים את רשימת הספקים כדי לא להציג תוצאות שגויות!
      return; // עוצרים ולא פונים לשרת!
    }

    setValidationError(""); // מנקים שגיאות קודמות אם הכל תקין

    try {
      setLoading(true);
      let response;
      if (hasSearchParams) {
        response = await API.post("/customer/Searching", searchParams);
      } else {
        response = await API.get("/customer/AllServices/APPROVED");
      }

      if (response.data.success) {
        setProviders(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching providers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchParams]);

  async function handleFavorite(provider) {
    const providerId = provider.id;
    try {
      if (providersFavorite.includes(provider.id)) {
        await API.delete(`/customer/removeFavoriteProvider/${providerId}`);
      } else {
        await API.post("/customer/addFavoriteProvider", {
          providerId: providerId,
        });
      }
      fetchAllFavoriteProviders();
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }

  async function fetchAllFavoriteProviders() {
    const response = await API.get("customer/AllFavoritesProvidersId");
    setProvidersFavorite(response.data.data);
  }

  useEffect(() => {
    fetchAllFavoriteProviders();
  }, []);

  function handleSelectHall(hallId) {
    if (hallId === selectedHallId) setSelectedHallId(null);
    else setSelectedHallId(hallId);
  }

  function handleToggleChief(chiefId) {
    setSelectedChiefIds((prev) => {
      if (prev.includes(chiefId)) {
        return prev.filter((id) => id !== chiefId);
      } else {
        return [...prev, chiefId];
      }
    });
  }
  const eventToUpdate =
    location.state?.Event || location.state?.dataToEvent || null;

  useEffect(() => {
    if (eventToUpdate) {
      setSearchParams({
        city: eventToUpdate.city || "",
        guest_number: eventToUpdate.guest_number || "",
        requested_date: eventToUpdate.requested_date || "",
        start_time: eventToUpdate.start_time || "",
        end_time: eventToUpdate.end_time || "",
        event_id: eventToUpdate.event_id || null,
        notesToHall: eventToUpdate.notesToHall || "",
        noteToChef: Array.isArray(eventToUpdate.chiefs)
        ? Object.fromEntries(
            eventToUpdate.chiefs.map((c) => [
              c.chief_id || c.id,
              c.noteToChef || "",
            ]),
          )
        : eventToUpdate.noteToChef || {},
        eventLocation:
          eventToUpdate.chiefs?.[0]?.chef_event_location || "",
      });

      setIsUpdating(true);
      setSelectedHallId(location.state?.hallId || null);
      setSelectedChiefIds(location.state?.selectedChiefsId || location.state?.ChiefIds || []);    }
  }, [eventToUpdate]);
  return (
    <div>
      <h1>Find Your Vendors</h1>

      <EventSummaryBar
        eventData={eventToUpdate}
        selectedHallId={selectedHallId}
        selectedChiefIds={selectedChiefIds}
        searchParams={searchParams}
        providers={providers}
      />

      <SearchFilters
        searchParams={searchParams}
        setSearchParams={setSearchParams}
      />

      {/* ⚠️ הצגת הודעת שגיאה אם הולדיציה נכשלה */}
      {validationError && (
        <div
          style={{
            color: "#d32f2f",
            backgroundColor: "#ffebee",
            padding: "10px 15px",
            borderRadius: "8px",
            margin: "15px 0",
            fontWeight: "bold",
            textAlign: "center",
            border: "1px solid #ef5350",
          }}
        >
          ⚠️ {validationError}
        </div>
      )}

      {loading ? (
        <p>Loading vendors...</p>
      ) : providers.length === 0 ? (
        <p>No vendors found matching your criteria.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {providers.map((provider) => {
            const isHall = provider.provider_type === "Hall_Owner";
            const isSelected = isHall
              ? selectedHallId === provider.id
              : selectedChiefIds.includes(provider.id);

            const handleSelect = () => {
              if (isHall) handleSelectHall(provider.id);
              else handleToggleChief(provider.id);
            };

            return (
              <ServiceCard
                key={provider.id}
                user={user}
                provider={provider}
                isSelected={isSelected}
                onSelect={handleSelect}
                isDateAndTimeSelected={isDateAndTimeSelected}
                isFavorite={providersFavorite.includes(provider.id)}
                handleFavorite={handleFavorite}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
