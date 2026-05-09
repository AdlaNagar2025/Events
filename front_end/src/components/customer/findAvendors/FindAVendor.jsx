import { useEffect, useState } from "react";
import classes from "./findavendor.module.css";
import ServiceCard from "../../BasicToProviderProfile/ServiceCard";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Search from "./Search";
import { useLocation } from "react-router-dom";
/**
 * קומפוננטת FindAVendor:
 * מנהלת את ממשק החיפוש והסינון של ספקי שירות.
 * מאפשרת למשתמש לחפש לפי מיקום, תאריך, שעה ותקציב.
 * מציגה את כל הספקים בטעינה ראשונית, ומתעדכנת לפי תוצאות החיפוש מהשרת.
 */
export default function FindAVendor({ user }) {
  const [selectedHallId, setSelectedHallId] = useState(null);
  const [selectedChiefIds, setSelectedChiefIds] = useState([]);
  const[isUpdating,setIsUpdating]=useState(false)
  const location = useLocation();
  const eventToUpdate = location.state?.Event; 
  useEffect(() => {
    if (eventToUpdate) {
      console.log("Updating existing event:", eventToUpdate);
      setSearchParams({
        city: "",
        guest_number: eventToUpdate.guest_number || "",
        requested_date: eventToUpdate.requested_date || "",
        start_time: eventToUpdate.start_time || "",
        end_time: eventToUpdate.end_time || "",
      });
      setIsUpdating(true);
      setIsSearch(true); 
      setSelectedHallId(location.state?.hallId);
      setSelectedChiefIds(location.state?.ChiefIds);
    }
  }, [eventToUpdate]);

  const navigate = useNavigate();
  const [selectedChiefs, setSelectedChiefs] = useState([]);
  const [selectedHall, setSelectedHall] = useState(null);
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
    if(isUpdating)
    {
      if(provider.provider_type==="Hall_Owner")
        setSelectedHallId((prev)=>(prev===provider.id ? null :provider.id))
      else  if (provider.provider_type === "Chief") {
        setSelectedChiefIds((prev)=>prev.some((pId)=>pId ===provider.id)?
        prev.filter((pId)=>pId!==provider.id):
        [...prev,provider.id]
      )}
    }
    else{
    if (provider.provider_type === "Hall_Owner") {
      setSelectedHall((prev) => (prev?.id === provider.id ? null : provider));
    } else if (provider.provider_type === "Chief") {
      setSelectedChiefs((prev) =>
        prev.some((p) => p.id === provider.id)
          ? prev.filter((p) => p.id !== provider.id) // הסרה
          : [...prev, provider],
      );
    }
  }
  };
  // function validation(){
  //     if (!searchParams.requested_date) {
  //       alert("Please select a date for your event.");
  //       return;
  //     }
  //     if (!searchParams.start_time) {
  //       alert("Please select a start time for your event.");
  //       return;
  //     }
  //     if (!searchParams.end_time) {
  //       alert("Please select a end time for your event.");
  //       return;
  //     }
  //     if (searchParams.start_time > searchParams.end_time) {
  //       alert("End time must be after start time.");
  //       return;
  //     }

  //     if (!searchParams.guest_number) {
  //       alert("Please select a capacity for your event.");
  //       return;
  //     }
  //     if (searchParams.guest_number && searchParams.guest_number <= 0) {
  //       alert("Capacity must be greater than 0");
  //       return;
  //     }

  //     if (searchParams.price && searchParams.price < 0) {
  //       alert("Price cannot be negative");
  //       return;
  //     }
  // }
  const validation = () => {
    const { requested_date, start_time, end_time, guest_number } = searchParams;
    if (!requested_date || !start_time || !end_time ) {
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
        selectedHall: selectedHall, // שולח אובייקט מלא
        selectedChiefs: selectedChiefs, // שולח מערך אובייקטים מלא
      },
    });
  };

  const handleUpdatingBooking = async () => {
    if (!validation()) return;
    try {
      const response = await axios.put(
        `http://localhost:3030/customer/updateEventData/${eventToUpdate.event_id}`,
        {
          searchParams, // מכיל תאריך, שעות וכו'
          hallId: selectedHallId,
          ChiefsIds: selectedChiefIds,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        alert("Event updated successfully! Statuses reset to pending.");
        navigate("/myBooking"); // חזרה לדף ההזמנות
      }
    } catch (error) {
      console.error("Update failed:", error);
      alert(
        "Failed to update event: " +
          (error.response?.data?.message || error.message),
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
                      isUpdating
                        ? p.provider_type === "Hall_Owner"
                          ? selectedHallId === p.id
                          : p.provider_type === "Chief"
                            ? selectedChiefIds.some(
                                (chiefId) => chiefId === p.id,
                              )
                            : ""
                        : p.provider_type === "Hall_Owner"
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
      {isUpdating && (
        <button className={classes.selectBtn} onClick={handleUpdatingBooking}>
          Update
        </button>
      )}
    </div>
  );
}
