import React, { useEffect, useState } from "react";
import EventSummaryBar from "./EventSummaryBar";
import SearchFilters from "./SearchFilters";
import ServiceCard from "../../shared/ServiceCard/ServiceCard";
import API from "../../../services/api";
import {
  BOOKING_POLICY,
  meetsBookingHours,
  validateSearchParams,
} from "../../../utils/validation";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

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
  const [searchSettled, setSearchSettled] = useState(false);
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
    const errorMessage = validateSearchParams(searchParams);
    if (errorMessage) {
      setValidationError(errorMessage);
      setProviders([]);
      setSearchSettled(false);
      return;
    }

    setValidationError("");

    try {
      setLoading(true);
      setSearchSettled(false);
      let response;
      if (hasSearchParams) {
        response = await API.post("/customer/Searching", searchParams);
      } else {
        response = await API.get("/customer/AllServices/APPROVED");
      }

      if (response.data.success) {
        const data = response.data.data || [];
        setProviders(data);
        // Real empty result — clear top selection
        if (data.length === 0) {
          setSelectedHallId(null);
          setSelectedChiefIds([]);
        }
      }
    } catch (error) {
      console.error("Error fetching providers:", error);
    } finally {
      setLoading(false);
      setSearchSettled(true);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchParams]);

  // Keep matching selections (e.g. ward); drop only IDs missing from results.
  // Skip empty providers list so a loading/transition wipe cannot clear ward.
  useEffect(() => {
    if (loading || !searchSettled) return;
    if (providers.length === 0) return;

    const visibleIds = new Set(providers.map((p) => Number(p.id)));
    let dropped = false;

    setSelectedHallId((prevHall) => {
      if (prevHall == null) return prevHall;
      if (visibleIds.has(Number(prevHall))) return prevHall;
      dropped = true;
      return null;
    });

    setSelectedChiefIds((prevChiefs) => {
      if (!prevChiefs.length) return prevChiefs;
      const kept = prevChiefs.filter((id) => visibleIds.has(Number(id)));
      if (kept.length !== prevChiefs.length) {
        dropped = true;
        return kept;
      }
      return prevChiefs;
    });

    if (dropped) {
      toast(
        "Some selected providers were removed because they no longer match your search (capacity, date, or time).",
        { icon: "⚠️" },
      );
    }
  }, [providers, loading, searchSettled]);

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
      setSelectedChiefIds(
        location.state?.selectedChiefsId || location.state?.ChiefIds || [],
      );
    }
  }, [eventToUpdate]);

  const lockCriticalFields =
    isUpdating &&
    Boolean(eventToUpdate?.requested_date && eventToUpdate?.start_time) &&
    !meetsBookingHours(
      eventToUpdate.requested_date,
      eventToUpdate.start_time,
      BOOKING_POLICY.CRITICAL_EDIT_HOURS,
    );

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
        lockCriticalFields={lockCriticalFields}
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
