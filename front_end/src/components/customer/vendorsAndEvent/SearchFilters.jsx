import React from "react";
import CitySelect from "../../shared/CitySelect";
import classes from "./searchfilters.module.css";

export default function SearchFilters({
  searchParams,
  setSearchParams,
  lockCriticalFields = false,
}) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (
      lockCriticalFields &&
      ["requested_date", "start_time", "end_time", "guest_number"].includes(
        name,
      )
    ) {
      return;
    }
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  function handleReset() {
    setSearchParams((prev) => {
      if (lockCriticalFields) {
        return {
          ...prev,
          city: "",
          price: "",
        };
      }
      return {
        requested_date: "",
        start_time: "",
        end_time: "",
        guest_number: "",
        city: "",
        price: "",
      };
    });
  }

  return (
    <div className={classes.container}>
      <h2>Find Your Event Team</h2>
      {lockCriticalFields && (
        <p className={classes.lockNote}>
          Date, time, and guest count are locked within 48 hours of the event.
          You can still add or remove providers.
        </p>
      )}
      <div className={classes.search}>
        <div className={classes.inputGroup}>
          <label htmlFor="date">Date:</label>
          <input
            id="date"
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={searchParams.requested_date}
            name="requested_date"
            onChange={handleInputChange}
            disabled={lockCriticalFields}
          />
        </div>

        <div className={classes.inputGroup}>
          <label htmlFor="startTime">Start Time:</label>
          <input
            id="startTime"
            type="time"
            value={searchParams.start_time}
            name="start_time"
            onChange={handleInputChange}
            disabled={lockCriticalFields}
          />
        </div>

        <div className={classes.inputGroup}>
          <label htmlFor="endTime">End Time:</label>
          <input
            id="endTime"
            type="time"
            value={searchParams.end_time}
            name="end_time"
            onChange={handleInputChange}
            disabled={lockCriticalFields}
          />
        </div>

        <div className={classes.inputGroup}>
          <label htmlFor="city">Location:</label>
          <CitySelect
            selectedCity={searchParams.city}
            onCityChange={(val) =>
              handleInputChange({ target: { name: "city", value: val } })
            }
          />
        </div>

        <div className={classes.inputGroup}>
          <label htmlFor="capacity">Capacity:</label>
          <input
            id="capacity"
            type="number"
            min="1"
            value={searchParams.guest_number}
            name="guest_number"
            onChange={handleInputChange}
            disabled={lockCriticalFields}
          />
        </div>

        <div className={classes.inputGroup}>
          <label htmlFor="price">Max Price:</label>
          <input
            id="price"
            type="number"
            min="0"
            value={searchParams.price}
            name="price"
            onChange={handleInputChange}
          />
        </div>

        <div className={classes.inputGroup}>
          <button type="button" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
