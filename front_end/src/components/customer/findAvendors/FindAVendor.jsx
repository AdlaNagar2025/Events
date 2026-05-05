import { useEffect, useState } from "react";
import classes from "./findavendor.module.css";
import ServiceCard from "../../BasicToProviderProfile/ServiceCard";
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
  const [selectedHall, setSelectedHall] = useState(null);
  const [selectedChiefs, setSelectedChiefs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [isSearch, setIsSearch] = useState(false);
  const [searchParams, setSearchParams] = useState({
    city: "",
    capacity: "",
    price: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  console.log(isSearch);
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


  const toggleProviderSelection = (provider) => {
    if (provider.provider_type === "Hall_Owner") {
      setSelectedHall((prev) => (prev?.id === provider.id ? null : provider));
    } else if (provider.provider_type === "Chief") {
      setSelectedChiefs(
        (prev) =>
          prev.some((p) => p.id === provider.id)
            ? prev.filter((p) => p.id !== provider.id) // הסרה
            : [...prev, provider], 
      );
    }
  };
  const handleBookingClick = () => {
    navigate("/bookEvent", {
      state: {
        dataToEvent: searchParams,
        selectedHall: selectedHall, // שולח אובייקט מלא
        selectedChiefs: selectedChiefs, // שולח מערך אובייקטים מלא
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
        setIsSearch={setIsSearch}
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
              {isSearch && (
                <div>
                  <input
                    type="checkbox"
                    checked={
                      p.provider_type === "Hall_Owner"
                        ? selectedHall?.id === p.id
                        : selectedChiefs.some((chief) => chief.id === p.id)
                    }
                    onChange={() => toggleProviderSelection(p)}
                  />
                  select
                </div>
              )}

              <ServiceCard user={user} provider={p} />
            </div>
          ))}
      </div>
      {(selectedHall != null || selectedChiefs.length > 0) && (
        <button className={classes.selectBtn} onClick={handleBookingClick}>
          select
        </button>
      )}
    </div>
  );
}
