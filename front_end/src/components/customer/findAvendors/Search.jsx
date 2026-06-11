import axios from "axios";
import classes from "./findavendor.module.css";
import CitySelect from "../../provider/CitySelect";

export default function Search({
  setProviders,
  allProviders,
  setIsLoading,
  isLoading,
  setSearchParams,
  searchParams,
  setIsSearch,
  isSearch,
  validation,
}) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleShowAll = () => {
    setIsSearch(false);
    setProviders(allProviders);
  };

  const handleSearch = async () => {
    if (!validation()) return;

    const capacity = Number(searchParams.guest_number);
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3030/customer/Searching",
        { ...searchParams, guest_number: capacity },
        { withCredentials: true },
      );
      const results = Array.isArray(response.data.data) ? response.data.data : [];
      setProviders(
        results.map((provider) => ({
          ...provider,
          provider_type: provider.provider_type || provider.role,
        })),
      );
      setIsSearch(true);
    } catch (error) {
      console.error("Search failed", error);
      alert("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={classes.container}>
      <h2>Find Your Event Team</h2>
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
          <CitySelect
            selectedCity={searchParams.city}
            onCityChange={(val) =>
              handleInputChange({ target: { name: "city", value: val } })
            }
          />
        </div>

        <div className={classes.inputGroup}>
          <label htmlFor="capacity">Capacity:</label>
          <input
            id="capacity"
            type="number"
            min="1"
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
            min="0"
            value={searchParams.price}
            name="price"
            onChange={handleInputChange}
          />
        </div>

        <div className={classes.inputGroup}>
          <label>&nbsp;</label>
          <button
            type="button"
            className={classes.searchBtn}
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>

        {isSearch && (
          <div className={classes.inputGroup}>
            <label>&nbsp;</label>
            <button
              type="button"
              className={classes.showAllBtn}
              onClick={handleShowAll}
              disabled={isLoading}
            >
              Show All Vendors
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
