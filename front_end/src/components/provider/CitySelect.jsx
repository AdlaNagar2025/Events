import axios from "axios";
import React, { useEffect, useState } from "react";
import Select from "react-select"; // ייבוא של הרכיב החדש

export default function CitySelect({ onCityChange, selectedCity }) {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3030/api/localities",
        );
        if (response.data.success) {
          setCities(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCities();
  }, []);

  if (loading) return <p>Loading cities...</p>;

  const handleSelectChange = (selectedOption) => {
    // selectedOption מכיל את האובייקט המלא של העיר שנבחרה
    const cityName = selectedOption ? selectedOption.value : "";
    const regionName = selectedOption ? selectedOption.region : "";

    onCityChange(cityName, regionName);
  };

  // בשביל react-select, הערך הנבחר הנוכחי חייב להיות אובייקט של { value, label }
  const currentInputValue =
    cities.find((c) => c.value === selectedCity) || null;

  return (
    <Select
      options={cities} // הוא מקבל את המערך שלך כי כבר בנית אותו בפורמט הנכון של value ו-label!
      value={currentInputValue}
      onChange={handleSelectChange}
      placeholder="Search and select city..."
      isClearable={true} // מאפשר לנקות את הבחירה בלחיצת X
      isSearchable={true} // מאפשר להקליד אותיות ולחפש!
    />
  );
}
