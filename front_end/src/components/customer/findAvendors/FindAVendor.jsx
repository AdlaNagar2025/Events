import { useEffect, useState } from "react";
import classes from "./findavendor.module.css";
import ServiceCard from "../../BasicToProviderProfile/ServiceCard";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import Search from "./Search";

export default function FindAVendor({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  // --- States ---
  const [selectedHallId, setSelectedHallId] = useState(null);
  const [selectedChiefIds, setSelectedChiefIds] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [isSearch, setIsSearch] = useState(false);
  const [searchParams, setSearchParams] = useState({
    city: "",
    guest_number: "",
    price: "",
    requested_date: "",
    start_time: "",
    end_time: "",
  });

  const eventToUpdate = location.state?.Event;

  // --- Effect 1: טעינה ראשונית של כל הספקים ---
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

  // --- Effect 2: אתחול נתונים במצב עדכון (מגיע מ-My Booking) ---
  useEffect(() => {
    if (eventToUpdate) {
      console.log("Setting up update mode for event:", eventToUpdate.event_id);
      setSearchParams({
        city: "",
        guest_number: eventToUpdate.guest_number || "",
        requested_date: eventToUpdate.requested_date || "",
        start_time: eventToUpdate.start_time || "",
        end_time: eventToUpdate.end_time || "",
      });
      setIsUpdating(true);
      setIsSearch(true);
      setSelectedHallId(location.state?.hallId || null);
      setSelectedChiefIds(location.state?.ChiefIds || []);
    }
  }, [eventToUpdate]);

  // --- Effect 3: "הניקוי השקט" - מוודא שהבחירה מסונכרנת עם תוצאות החיפוש ---
  useEffect(() => {
    // מריצים את הניקוי רק אם המשתמש ביצע חיפוש אקטיבי ויש תוצאות
    if (!isSearch || providers.length === 0) return;
    const visibleIds = providers.map((p) => p.id);
    // ניקוי אולם
    if (selectedHallId && !visibleIds.includes(selectedHallId)) {
      console.log("Removing unavailable hall from selection");
      setSelectedHallId(null);
    }

    // ניקוי שפים
    setSelectedChiefIds((prev) => {
      const filtered = prev.filter((id) => visibleIds.includes(id));
      // רק אם באמת היה שינוי נעדכן את ה-State (למניעת לולאות אינסופיות)
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [providers, isSearch]);

  // --- Functions ---
  const toggleProviderSelection = (provider) => {
    if (provider.provider_type === "Hall_Owner") {
      setSelectedHallId((prev) => (prev === provider.id ? null : provider.id));
    } else if (provider.provider_type === "Chief") {
      setSelectedChiefIds((prev) =>
        prev.includes(provider.id)
          ? prev.filter((id) => id !== provider.id)
          : [...prev, provider.id],
      );
    }
  };

  const validation = () => {
    const { requested_date, start_time, end_time, guest_number } = searchParams;
    if (!requested_date || !start_time || !end_time) {
      alert("Please fill in all date and time fields.");
      return false;
    }
    if (start_time >= end_time) {
      alert("End time must be after start time.");
      return false;
    }
    if (!guest_number || guest_number <= 0) {
      alert("Capacity must be greater than 0.");
      return false;
    }
    return true;
  };

  const handleBookingClick = () => {
    navigate("/bookEvent", {
      state: {
        dataToEvent: searchParams,
        hallId: selectedHallId,
        selectedChiefsId: selectedChiefIds,
      },
    });
  };

  const handleUpdatingBooking = async () => {
    if (!validation()) return;
    try {
      const response = await axios.put(
        `http://localhost:3030/customer/updateEventData/${eventToUpdate.event_id}`,
        {
          searchParams,
          hallId: selectedHallId,
          ChiefsIds: selectedChiefIds,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        alert("Event updated successfully!");
        navigate("/myBooking");
      }
    } catch (error) {
      console.error("Update failed:", error);
      alert(
        "Update failed: " + (error.response?.data?.message || error.message),
      );
    }
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
        validation={validation}
      />

      <div className={classes.providersGrid}>
        {providers.length === 0 && (
          <p className={classes.noResults}>
            No vendors found for your criteria.
          </p>
        )}
        {providers.map((p) => (
          <div key={p.id} className={classes.selector}>
            {isSearch && (
              <div>
                <input
                  type="checkbox"
                  checked={
                    p.provider_type === "Hall_Owner"
                      ? selectedHallId === p.id
                      : selectedChiefIds.includes(p.id)
                  }
                  onChange={() => toggleProviderSelection(p)}
                />
                <span>Select</span>
              </div>
            )}
            <ServiceCard user={user} provider={p} />
          </div>
        ))}
      </div>

      {!isUpdating && (selectedHallId || selectedChiefIds.length > 0) && (
        <button className={classes.selectBtn} onClick={handleBookingClick}>
          Book Now
        </button>
      )}

      {isUpdating && (
        <button className={classes.selectBtn} onClick={handleUpdatingBooking}>
          Update Event
        </button>
      )}
    </div>
  );
}
