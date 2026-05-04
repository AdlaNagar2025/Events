import { useEffect, useState } from "react";
import classes from "./findavendor.module.css";
import ServiceCard from "../BasicToProviderProfile/ServiceCard";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Search from "./Search";
/**
 * קומפוננטת FindAVendor:
 * מנהלת את ממשק החיפוש והסינון של ספקי שירות.
 * מאפשרת למשתמש לחפש לפי מיקום, תאריך, שעה ותקציב.
 * מציגה את כל הספקים בטעינה ראשונית, ומתעדכנת לפי תוצאות החיפוש מהשרת.
 */
export default function FindAVendor({ user }) {
  const navigate = useNavigate();
  const [selectedProviderIds, setSelectedProviderIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState([]); 
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

  const toggleProviderSelection = (providerId) => {
    setSelectedProviderIds(
      (prev) =>
        prev.includes(providerId)
          ? prev.filter((id) => id !== providerId) // אם קיים - תוריד
          : [...prev, providerId], // אם לא קיים - תוסיף
    );
  };
  console.log(selectedProviderIds);
  const handleBookingClick = () => {
    navigate("/bookEvent", {
      state: {
        dataToEvent: searchParams,
        selectedProviderIds: selectedProviderIds,
      },
    });
  };
  return (
    <div>
      <Search
        setProviders={setProviders}
        setIsLoading={setIsLoading}
        isLoading={isLoading}
        setSearchParams={setSearchParams}
        searchParams={searchParams}
      />
      <div className={classes.providersGrid}>
        {providers.length == 0 && (
          <p className={classes.noResults}>
            No vendors found for your criteria.
          </p>
        )}
        {providers.length > 0 &&
          providers.map((p) => (
            <div key={p.id} className={classes.selector}>
              <input
                type="checkbox"
                onChange={() => toggleProviderSelection(p.id)}
              />
              select
              <ServiceCard user={user} provider={p} />
            </div>
          ))}
      </div>
      {selectedProviderIds.length > 0 && (
        <button className={classes.selectBtn} onClick={handleBookingClick}>
          select
        </button>
      )}
    </div>
  );
}
