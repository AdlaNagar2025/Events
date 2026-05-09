// import { useEffect, useState } from "react";
// import classes from "./findavendor.module.css";
// import ServiceCard from "../../BasicToProviderProfile/ServiceCard";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import Search from "./Search";
// import { useLocation } from "react-router-dom";
// /**
//  * קומפוננטת FindAVendor:
//  * מנהלת את ממשק החיפוש והסינון של ספקי שירות.
//  * מאפשרת למשתמש לחפש לפי מיקום, תאריך, שעה ותקציב.
//  * מציגה את כל הספקים בטעינה ראשונית, ומתעדכנת לפי תוצאות החיפוש מהשרת.
//  */
// export default function FindAVendor({ user }) {
//   const [selectedHallId, setSelectedHallId] = useState(null);
//   const [selectedChiefIds, setSelectedChiefIds] = useState([]);
//   const [isUpdating, setIsUpdating] = useState(false);
//   const location = useLocation();
//   const eventToUpdate = location.state?.Event;
//   useEffect(() => {
//     if (eventToUpdate) {
//       console.log("Updating existing event:", eventToUpdate);
//       setSearchParams({
//         city: "",
//         guest_number: eventToUpdate.guest_number || "",
//         requested_date: eventToUpdate.requested_date || "",
//         start_time: eventToUpdate.start_time || "",
//         end_time: eventToUpdate.end_time || "",
//       });
//       useEffect(() => {
//         if (!isSearch || providers.length === 0) return;

//         const visibleIds = providers.map((p) => p.id);
//         // בדיקת האולם: אם הוא לא בתוצאות, נאפס אותו
//         if (selectedHallId && !visibleIds.includes(selectedHallId)) {
//           setSelectedHallId(null);
//         }

//         // בדיקת השפים: נשאיר רק את אלו שמופיעים בתוצאות
//         setSelectedChiefIds((prev) =>
//           prev.filter((id) => visibleIds.includes(id)),
//         );
//       }, [providers]); // ירוץ בכל פעם שהספקים משתנים
//       setIsUpdating(true);
//       setIsSearch(true);
//       setSelectedHallId(location.state?.hallId);
//       setSelectedChiefIds(location.state?.ChiefIds || []);
//     }
//   }, [eventToUpdate]);

//   const navigate = useNavigate();

//   const [isLoading, setIsLoading] = useState(false);
//   const [providers, setProviders] = useState([]);
//   const [isSearch, setIsSearch] = useState(false);
//   const [searchParams, setSearchParams] = useState({
//     city: "",
//     guest_number: "",
//     price: "",
//     requested_date: "",
//     start_time: "",
//     end_time: "",
//   });
//   // טעינת כל הספקים בטעינת הדף
//   useEffect(() => {
//     const fetchAllServices = async () => {
//       try {
//         const response = await axios.get(
//           "http://localhost:3030/customer/AllServices",
//           { withCredentials: true },
//         );
//         if (response.data.success) {
//           setProviders(response.data.data);
//         }
//       } catch (error) {
//         console.error("Fetch failed:", error.message);
//       }
//     };
//     fetchAllServices();
//   }, []);

//   const toggleProviderSelection = (provider) => {
//     if (provider.provider_type === "Hall_Owner") {
//       setSelectedHallId((prev) => (prev === provider.id ? null : provider.id));
//     } else if (provider.provider_type === "Chief") {
//       setSelectedChiefIds(
//         (prev) =>
//           prev.includes(provider.id)
//             ? prev.filter((id) => id !== provider.id) // הסרה
//             : [...prev, provider.id], // הוספה
//       );
//     }
//   };
//   const validation = () => {
//     const { requested_date, start_time, end_time, guest_number } = searchParams;
//     if (!requested_date || !start_time || !end_time) {
//       alert("Please fill in all date and time fields.");
//       return false;
//     }
//     if (start_time >= end_time) {
//       alert("End time must be after start time.");
//       return false;
//     }
//     if (!guest_number || guest_number <= 0) {
//       alert("Capacity must be greater than 0.");
//       return false;
//     }
//     return true;
//   };
//   // const handleBookingClick = () => {
//   //   navigate("/bookEvent", {
//   //     state: {
//   //       dataToEvent: searchParams,
//   //       selectedHall: selectedHall, // שולח אובייקט מלא
//   //       selectedChiefs: selectedChiefs, // שולח מערך אובייקטים מלא
//   //     },
//   //   });
//   // };
//   const handleBookingClick = () => {
//     navigate("/bookEvent", {
//       state: {
//         dataToEvent: searchParams,
//         hallId: selectedHallId, // שולח רק ID
//         selectedChiefsId: selectedChiefIds, // שולח רק מערך IDs
//       },
//     });
//   };
//   const handleUpdatingBooking = async () => {
//     if (!validation()) return;
//     try {
//       const response = await axios.put(
//         `http://localhost:3030/customer/updateEventData/${eventToUpdate.event_id}`,
//         {
//           searchParams,
//           hallId: selectedHallId,
//           ChiefsIds: selectedChiefIds,
//         },
//         { withCredentials: true },
//       );

//       if (response.data.success) {
//         alert("Event updated successfully! Statuses reset to pending.");
//         navigate("/myBooking"); // חזרה לדף ההזמנות
//       }
//     } catch (error) {
//       console.error("Update failed:", error);
//       alert(
//         "Failed to update event: " +
//           (error.response?.data?.message || error.message),
//       );
//     }
//   };
//   return (
//     <div>
//       <Search
//         setProviders={setProviders}
//         setIsLoading={setIsLoading}
//         isLoading={isLoading}
//         setSearchParams={setSearchParams}
//         searchParams={searchParams}
//         setIsSearch={setIsSearch}
//         validation={validation}
//       />
//       <div className={classes.providersGrid}>
//         {providers.length == 0 && (
//           <p className={classes.noResults}>
//             No vendors found for your criteria.
//           </p>
//         )}
//         {providers.length > 0 &&
//           providers.map((p) => (
//             <div key={p.id} className={classes.selector}>
//               {isSearch && (
//                 <div>
//                   <input
//                     type="checkbox"
//                     checked={
//                       p.provider_type === "Hall_Owner"
//                         ? selectedHallId === p.id
//                         : selectedChiefIds.includes(p.id)
//                     }
//                     onChange={() => toggleProviderSelection(p)}
//                   />
//                   se
//                 </div>
//               )}

//               <ServiceCard user={user} provider={p} />
//             </div>
//           ))}
//       </div>

//       {/* כפתור הזמנה חדשה - מופיע רק אם אנחנו לא במצב עדכון ונבחר משהו */}
//       {!isUpdating && (selectedHallId || selectedChiefIds.length > 0) && (
//         <button className={classes.selectBtn} onClick={handleBookingClick}>
//           Book Now
//         </button>
//       )}

//       {/* כפתור עדכון - מופיע רק אם אנחנו במצב עדכון */}
//       {isUpdating && (
//         <button className={classes.selectBtn} onClick={handleUpdatingBooking}>
//           Update Event
//         </button>
//       )}
//     </div>
//   );
// }
