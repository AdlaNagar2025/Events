import React, { useEffect, useState } from "react";
import EventSummaryBar from "./EventSummaryBar";
import SearchFilters from "./SearchFilters";
import ServiceCard from "../../shared/ServiceCard/ServiceCard";
import API from "../../../services/api";
import { validateSearchParams } from "../../../utils/validation"; // 👈 ייבוא פונקציית הולדיציה

export default function FindAVendors({ user }) {
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

  return (
    <div>
      <h1>Find Your Vendors</h1>

      <EventSummaryBar
        selectedHallId={selectedHallId}
        selectedChiefIds={selectedChiefIds}
        providers={providers}
        onProceed={() => console.log("Proceed to booking!")}
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
                provider={provider}
                user={user}
                isSelected={isSelected}
                onSelect={handleSelect}
                isDateAndTimeSelected={isDateAndTimeSelected}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
