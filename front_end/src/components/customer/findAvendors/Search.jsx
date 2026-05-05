import React from "react";
import { useState } from "react";
import axios from "axios";
import classes from "./findavendor.module.css";

export default function Search({
  setProviders,
  setIsLoading,
  isLoading,
  setSearchParams,
  searchParams,
  setIsSearch,
}) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async () => {
    if (!searchParams.date) {
      alert("Please select a date for your event.");
      return;
    }
    if (!searchParams.startTime) {
      alert("Please select a start time for your event.");
      return;
    }
    if (!searchParams.endTime) {
      alert("Please select a end time for your event.");
      return;
    }
    if (searchParams.startTime > searchParams.endTime) {
      alert("End time must be after start time.");
      return;
    }

    if (!searchParams.capacity) {
      alert("Please select a capacity for your event.");
      return;
    }
    if (searchParams.capacity && searchParams.capacity <= 0) {
      alert("Capacity must be greater than 0");
      return;
    }

    if (searchParams.price && searchParams.price < 0) {
      alert("Price cannot be negative");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3030/customer/Searching",
        searchParams,
        { withCredentials: true },
      );
      setProviders(response.data.data);
    } catch (error) {
      console.log("Search failed", error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className={classes.container}>
      <h2>Find Your Event Team: Unified Vendor Search</h2>
      <div className={classes.search}>
        <div className={classes.inputGroup}>
          <label htmlFor="date">Date:</label>
          <input
            id="date"
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={searchParams.date}
            name="date"
            onChange={handleInputChange}
          />
        </div>

        <div className={classes.inputGroup}>
          <label htmlFor="startTime">Start Time:</label>
          <input
            id="startTime"
            type="time"
            value={searchParams.startTime}
            name="startTime"
            onChange={handleInputChange}
          />
        </div>

        <div className={classes.inputGroup}>
          <label htmlFor="endTime">End Time:</label>
          <input
            id="endTime"
            type="time"
            value={searchParams.endTime}
            name="endTime"
            onChange={handleInputChange}
          />
        </div>

        <div className={classes.inputGroup}>
          <label htmlFor="city">Location:</label>
          <input
            id="city"
            type="text"
            value={searchParams.city}
            name="city"
            onChange={handleInputChange}
            placeholder="Enter city..."
          />
        </div>

        <div className={classes.inputGroup}>
          <label htmlFor="capacity">Capacity:</label>
          <input
            id="capacity"
            type="number"
            value={searchParams.capacity}
            name="capacity"
            onChange={handleInputChange}
          />
        </div>

        <div className={classes.inputGroup}>
          <label htmlFor="price">Max Price:</label>
          <input
            id="price"
            type="number"
            value={searchParams.price}
            name="price"
            onChange={handleInputChange}
          />
        </div>

        <button
          onClick={() => {
            setIsSearch(true);
            handleSearch();
          }}
          disabled={isLoading}
          className={classes.searchBtn}
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </div>
    </div>
  );
}
