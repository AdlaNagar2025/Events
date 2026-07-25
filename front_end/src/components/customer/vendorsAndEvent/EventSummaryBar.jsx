import React from "react";

export default function EventSummaryBar({
  selectedHallId,
  selectedChiefIds,
  providers,
  onProceed,
}) {
  console.log("the data of providers", providers);
  // 1. Find selected hall safely
  const selectedHall = providers.find((p) => p.id === selectedHallId);

  // 2. Filter selected chefs from the providers list
  const selectedChiefs = providers.filter((p) =>
    selectedChiefIds.includes(p.id),
  );

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "15px",
        marginBottom: "20px",
      }}
    >
      <h3>🎉 Your Event Selection Summary</h3>

      {/* Hall Status */}
      <div>
        <strong>🏛️ Selected Venue: </strong>
        {selectedHall ? (
          <span>{selectedHall.ServiceName}</span>
        ) : (
          <span style={{ color: "red" }}>No venue selected yet (Required)</span>
        )}
      </div>

      {/* Chefs Status */}
      <div>
        <strong>👨‍🍳 Selected Chefs/Catering ({selectedChiefs.length}): </strong>
        {selectedChiefs.length === 0 ? (
          <span>No chefs selected</span>
        ) : (
          <ul>
            {selectedChiefs.map((chief) => (
              <li key={chief.id}>{chief.first_name}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Proceed Button */}
      <button
        onClick={onProceed}
        disabled={!selectedHallId || !selectedChiefs.length === 0}
      >
        Proceed to Booking ({selectedHallId ? 1 + selectedChiefs.length : 0}{" "}
        Items)
      </button>
    </div>
  );
}
