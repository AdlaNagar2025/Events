import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import classes from "./findavendor.module.css";

export default function Search({
  setProviders,
  setIsLoading,
  isLoading,
  setSearchParams,
  searchParams,
  setIsSearch,
  validation,
}) {
  useEffect(() => {
    if (
      searchParams.requested_date &&
      searchParams.start_time &&
      searchParams.end_time &&
      searchParams.guest_number > 0
    ) {
      // השהיה קטנה (Optional) כדי לא להעמיס
      const delayDebounceFn = setTimeout(() => {
        handleSearch();
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchParams]);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setIsSearch(false);
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async () => {
    const currentTime = new Date().toTimeString().slice(0, 5);
    const today = new Date().toISOString().split("T")[0];

    const { requested_date, start_time, end_time, guest_number } = searchParams;
    if (
      !requested_date ||
      !start_time ||
      !end_time ||
      guest_number <= 0 ||
      start_time >= end_time ||
      (requested_date === today && start_time <= currentTime)
    ) {
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
      setIsSearch(true);
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
            value={searchParams.requested_date}
            name="requested_date"
            onChange={handleInputChange}
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
            value={searchParams.guest_number}
            name="guest_number"
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
        {/* 
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className={classes.searchBtn}
        >
          {isLoading ? "Searching..." : "Search"}
        </button> */}
      </div>
    </div>
  );
}
