import axios from "axios";
import React, { useEffect, useState } from "react";

// אנחנו מקבלים Props כדי שנוכל לעדכן את ה-State של האבא
export default function CitySelect() {
  // {
  //   (onCityChange, selectedCity);
  // }
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(
          "https://data.gov.il/api/3/action/datastore_search?resource_id=5c78ad88-2832-41ec-b7a7-50997a27457b&limit=50", // הגדלתי את הלימיט כדי שכל הערים יכנסו
        );
        console.log(response.data.result)
        // סינון ומיון הנתונים
        const cityList = response.data.result.records
          .map((record) => record.שם_יישוב.trim()) // ניקוי רווחים
          .sort((a, b) => a.localeCompare("he")); // מיון לפי הא'-ב'

          console.log(cityList)

        setCities(cityList);
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
    <div>cities</div>
    // <select
    //   name="city"
    //   value={selectedCity}
    //   onChange={(e) => onCityChange(e.target.value)}
    //   required
    // >
    //   <option value="">Select a City</option>
    //   {cities.map((city, index) => (
    //     <option key={index} value={city}>
    //       {city}
    //     </option>
    //   ))}
    // </select>
  );
}
{/* <CitySelect
  selectedCity={user.role === "Chief" ? chiefData.city : hallData.city}
  onCityChange={(value) => {
    // כאן את מעדכנת את ה-State הקיים שלך
    if (user.role === "Chief") {
      setChiefData((prev) => ({ ...prev, city: value }));
    } else {
      setHallData((prev) => ({ ...prev, city: value }));
    }
  }}
/>; */}