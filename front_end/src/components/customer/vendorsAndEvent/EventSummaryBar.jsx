import React from "react";
import BookEvent from "../BOOKEVENT/BookEvent";
import { useNavigate, useLocation } from "react-router-dom";


export default function EventSummaryBar({
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
    return diffInHours > 0 ? diffInHours : 1;
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

  const totalPrice = hallPrice + chiefsPrice;
  const hasSelections = selectedHall || selectedChiefs.length > 0;



    const handleBookingClick = () => {
      navigate("/customer/book-event", {
        state: {
          dataToEvent: searchParams,
          hallId: selectedHallId,
          selectedChiefsId: selectedChiefIds,
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
              {totalPrice} ₪
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
          }}>
          Proceed to Booking Order →
        </button>
      </div>
    </div>
  );
}
