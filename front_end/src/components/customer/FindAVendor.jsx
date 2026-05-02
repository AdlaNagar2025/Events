import { useEffect, useState } from "react";
import classes from "./findavendor.module.css";
import ServiceCard from "../BasicToProviderProfile/ServiceCard";
import axios from "axios";
/**
 * קומפוננטת FindAVendor:
 * מנהלת את ממשק החיפוש והסינון של ספקי שירות.
 * מאפשרת למשתמש לחפש לפי מיקום, תאריך, שעה ותקציב.
 * מציגה את כל הספקים בטעינה ראשונית, ומתעדכנת לפי תוצאות החיפוש מהשרת.
 */
export default function FindAVendor({ user }) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [providers, setProviders] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchParams, setSearchParams] = useState({
    city: "",
    capacity: "",
    price: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  // טעינת כל הספקים בטעינת הדף
  useEffect(() => {
    const fetchAllServices = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3030/customer/AllServices",
          { withCredentials: true },
        );
        if (response.data.success) {
          setProviders(response.data.data);
        }
      } catch (error) {
        console.error("Fetch failed:", error.message);
      }
    };
    fetchAllServices();
  }, []);

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

    console.log(searchParams.startTime);
    console.log(searchParams.endTime);
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
    setHasSearched(true);
    try {
      const response = await axios.post(
        "http://localhost:3030/customer/Searching",
        searchParams,
        { withCredentials: true },
      );
      setSearchResults(response.data.data);
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
          onClick={handleSearch}
          disabled={isLoading}
          className={classes.searchBtn}
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </div>

      <hr />

      {/* תצוגת תוצאות החיפוש */}
      <div className={classes.result}>
        {searchResults.length > 0 ? (
          searchResults.map((p) => (
            <ServiceCard
              user={user}
              provider={p}
              key={p.id}
              searchParams={searchParams}
            />
          ))
        ) : hasSearched && !isLoading ? (
          <p className={classes.noResults}>
            No vendors found for your criteria.
          </p>
        ) : null}
      </div>

      {/* תצוגת ברירת מחדל - לפני שבוצע חיפוש */}
      {!hasSearched && (
        <div className={classes.providersGrid}>
          {providers.map((p) => (
            <ServiceCard
              key={p.id}
              user={user}
              provider={p}
              data={searchParams}
            />
          ))}
        </div>
      )}

      {user?.role !== "Admin" && (
              <button
                // onClick={handleSelectProvider}
                // className={classes.selectBtn}
              >
                select
              </button>
            )}
    </div>
  );
}
