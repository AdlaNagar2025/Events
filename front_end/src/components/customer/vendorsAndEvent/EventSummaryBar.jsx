import React from "react";
import BookEvent from "../BOOKEVENT/BookEvent";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

export default function EventSummaryBar({
  eventData = null,
  selectedHallId,
  selectedChiefIds,
  providers,
  searchParams,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // 1. חישוב כמות השעות מתוך start_time ו-end_time
  const calculateHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 1; // ברירת מחדל: שעה אחת אם לא נבחרו שעות

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const startInMinutes = startH * 60 + startM;
    let endInMinutes = endH * 60 + endM;

    // במידה והאירוע גולש מעבר לחצות (למשל מ-22:00 עד 02:00)
    if (endInMinutes <= startInMinutes) {
      endInMinutes += 24 * 60;
    }

    const diffInHours = (endInMinutes - startInMinutes) / 60;
    return diffInHours > 0 ? Math.round(diffInHours * 100) / 100 : 1;
  };

  const totalEventHours = calculateHours(
    searchParams?.start_time,
    searchParams?.end_time,
  );

  // 2. מציאת אובייקט האולם שנבחר
  const selectedHall = providers.find((p) => p.id === selectedHallId);

  // 3. מציאת אובייקטי השפים שנבחרו
  const selectedChiefs = providers.filter((p) =>
    selectedChiefIds.includes(p.id),
  );

  // 4. חישוב מחיר אולם (מחיר קבוע)
  const hallPrice = Number(
    selectedHall?.display_price || selectedHall?.price || 0,
  );

  // 5. חישוב מחיר שפים: מחיר לשעה × כמות שעות האירוע
  const chiefsPrice = selectedChiefs.reduce((sum, chef) => {
    const hourlyRate = Number(
      chef.price_per_hour || chef.display_price || chef.price || 0,
    );
    return sum + hourlyRate * totalEventHours;
  }, 0);

  const totalPrice = Math.round((hallPrice + chiefsPrice) * 100) / 100;
  const hasSelections = selectedHall || selectedChiefs.length > 0;

  const handleBookingClick = () => {
    const eventId = searchParams?.event_id || eventData?.event_id || null;
    const startTime = String(searchParams?.start_time || "").slice(0, 5);
    const endTime = String(searchParams?.end_time || "").slice(0, 5);

    if (startTime && endTime) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      let durationMinutes = endH * 60 + endM - (startH * 60 + startM);
      if (durationMinutes <= 0) durationMinutes += 24 * 60;

      if (durationMinutes < 30) {
        toast.error("Event duration must be at least 30 minutes.");
        return;
      }
    }

    // New bookings: 6h before start. Updates: provider changes need 6h left.
    if (!eventId) {
      const dateStr = String(searchParams?.requested_date || "").split("T")[0];
      const timeStr = startTime;

      if (!dateStr || !timeStr) {
        toast.error("Please select event date and start time first.");
        return;
      }

      const eventStart = new Date(`${dateStr}T${timeStr}`);
      const hoursUntilStart = (eventStart - new Date()) / (1000 * 60 * 60);

      if (Number.isNaN(eventStart.getTime()) || hoursUntilStart < 6) {
        toast.error(
          "Events must be booked at least 6 hours before the start time.",
        );
        return;
      }
    } else {
      const dateStr = String(
        eventData?.requested_date || searchParams?.requested_date || "",
      ).split("T")[0];
      const timeStr = String(
        eventData?.start_time || searchParams?.start_time || "",
      ).slice(0, 5);
      const eventStart = new Date(`${dateStr}T${timeStr}`);
      const hoursUntilStart = (eventStart - new Date()) / (1000 * 60 * 60);

      if (Number.isNaN(eventStart.getTime()) || hoursUntilStart < 6) {
        toast.error(
          "Providers cannot be added or removed less than 6 hours before the event.",
        );
        return;
      }
    }

    navigate("/customer/book-event", {
      state: {
        dataToEvent: searchParams,
        hallId: selectedHallId,
        selectedChiefsId: selectedChiefIds,
        eventId,
      },
    });
  };

  return (
    <div
      style={{
        position: "sticky",
        top: "10px",
        zIndex: 100,
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        padding: "16px 24px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        marginBottom: "24px",
        border: "1px solid #e0e0e0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "15px",
      }}
    >
      {/* 🏛️ אולם שנבחר */}
      <div style={{ flex: 1, minWidth: "200px" }}>
        <h4 style={{ margin: "0 0 5px 0", color: "#666", fontSize: "0.85rem" }}>
          VENUE (HALL)
        </h4>
        {selectedHall ? (
          <div>
            <strong>
              {selectedHall.ServiceName || selectedHall.first_name}
            </strong>
            <span style={{ color: "#2e7d32", marginLeft: "8px" }}>
              ({hallPrice > 0 ? `${hallPrice} ₪` : "Included"})
            </span>
          </div>
        ) : (
          <span style={{ color: "#aaa", fontStyle: "italic" }}>
            No venue selected
          </span>
        )}
      </div>

      {/* 👨‍🍳 שפים שנבחרו */}
      <div style={{ flex: 1, minWidth: "200px" }}>
        <h4 style={{ margin: "0 0 5px 0", color: "#666", fontSize: "0.85rem" }}>
          CATERING (CHEFS)
        </h4>
        {selectedChiefs.length > 0 ? (
          <div>
            <strong>{selectedChiefs.length} Chef(s) selected</strong>
            <div style={{ fontSize: "0.85rem", color: "#555" }}>
              {selectedChiefs
                .map((c) => c.ServiceName || c.first_name)
                .join(", ")}
            </div>
            <div
              style={{ fontSize: "0.75rem", color: "#888", marginTop: "2px" }}
            >
              ⏱️ {totalEventHours} hour(s) × hourly rate
            </div>
          </div>
        ) : (
          <span style={{ color: "#aaa", fontStyle: "italic" }}>
            No chefs selected
          </span>
        )}
      </div>

      {/* 💰 סכום כולל וכפתור סיום */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {totalPrice > 0 && (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "0.8rem", color: "#666" }}>
              Est. Total ({totalEventHours} hrs):
            </span>
            <div
              style={{
                fontSize: "1.3rem",
                fontWeight: "bold",
                color: "#1976d2",
              }}
            >
              {totalPrice.toFixed(2)} ₪
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!hasSelections}
          onClick={handleBookingClick}
          style={{
            backgroundColor: hasSelections ? "#2e7d32" : "#ccc",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: hasSelections ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
          }}
        >
          Proceed to Booking Order →
        </button>
      </div>
    </div>
  );
}
