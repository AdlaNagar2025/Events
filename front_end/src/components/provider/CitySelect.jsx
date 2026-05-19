import axios from "axios";
import React, { useEffect, useState } from "react";

export default function CitySelect({ onCityChange, selectedCity }) {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3030/api/localities",
        );
        // response.data.data הוא עכשיו מערך של אובייקטים: [{value, label, region, nameEn}, ...]
        setCities(response.data.data);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCities();
  }, []);

  if (loading) return <p>Loading cities...</p>;

  return (
    <select
      // וודאי שיש עיצוב שמתאים לשאר הקלט
      value={selectedCity || ""}
      onChange={(e) => onCityChange(e.target.value)}
      required
    >
      <option value="">Select City</option>
      {cities.map((city, index) => (
        <option key={index} value={city.nameEn}>
          {city.nameEn} {/* מוצג בעברית, נשמר ב-DB מה שמופיע ב-value */}
        </option>
      ))}
    </select>
  );
}

// // הוספנו כאן את ה-Props בתוך סוגריים מסולסלים
// export default function CitySelect({ onCityChange, selectedCity }) {
//   const [cities, setCities] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchCities = async () => {
//       try {
//         const response = await axios.get(
//           "http://localhost:3030/api/localities",
//         );

//         // מוודאים שאנחנו לוקחים רק את שמות הערים ומנקים כפילויות/ריקים
//         const cityNames = response.data.data
//           .map((item) => item.nameEn)
//           .filter((name) => name && name.trim() !== "")
//           .sort((a, b) => a.localeCompare("en"));

//         setCities(cityNames);
//       } catch (error) {
//         console.error("Error fetching cities:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchCities();
//   }, []);

//   if (loading) return <p>טוען רשימת ערים...</p>;

//   return (
//     <select
//       name="city"
//       value={selectedCity || ""} // משתמש ב-Prop שקיבלנו
//       onChange={(e) => onCityChange(e.target.value)} // משתמש ב-Prop שקיבלנו
//       required
//     >
//       <option value="">בחר עיר</option>
//       {cities.map((city, index) => (
//         <option key={index} value={city}>
//           {city}
//         </option>
//       ))}
//     </select>
//   );
// }
