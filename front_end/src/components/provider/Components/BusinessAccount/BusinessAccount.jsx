import React, { useEffect, useState } from "react";
import API from "../../../../services/api";
import toast from "react-hot-toast";
import classes from "./BusinessAccount.module.css";
import FormInput from "./FormInput";

const initialChief = {
  specialty: "",
  phone: "",
  price_per_hour: "",
  start_year: "",
  description: "",
  capacity: "",
  city: "",
  region: "",
};

const initialHall = {
  hall_name: "",
  city: "",
  price: "",
  phone: "",
  capacity: "",
  email: "",
  description: "",
  region: "",
};

const CHIEF_FIELDS = [
  {
    label: "Specialty",
    name: "specialty",
    placeholder: "e.g. Italian",
    required: true,
  },
  {
    label: "Price/Hour",
    name: "price_per_hour",
    type: "number",
    required: true,
  },
  { label: "Start Year", name: "start_year", type: "number", required: true },
  { label: "Max Capacity", name: "capacity", type: "number", required: true },
  {
    label: "Phone",
    name: "phone",
    type: "tel",
    required: false,
    extraProps: { pattern: "^05\\d{8}$" },
  },
  { label: "City", name: "city", required: true },
];

const HALL_FIELDS = [
  { label: "Hall Name", name: "hall_name", required: true },
  { label: "Price", name: "price", type: "number", required: true },
  { label: "Email", name: "email", type: "email", required: false },
  {
    label: "Phone",
    name: "phone",
    type: "tel",
    required: false,
    extraProps: { pattern: "^05\\d{8}$" },
  },
  { label: "Capacity", name: "capacity", type: "number", required: true },
  { label: "City", name: "city", required: true },
];

export default function BusinessAccount({
  user,
  isDisable,
  setIsProfileFilled,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chiefData, setChiefData] = useState(initialChief);
  const [hallData, setHallData] = useState(initialHall);

  const isChief = user?.role === "Chief";
  const data = isChief ? chiefData : hallData;
  const relevantFields = isChief ? CHIEF_FIELDS : HALL_FIELDS;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "city_and_region") {
      if (isChief) {
        setChiefData((prev) => ({
          ...prev,
          city: value.city,
          region: value.region,
        }));
      } else {
        setHallData((prev) => ({
          ...prev,
          city: value.city,
          region: value.region,
        }));
      }
    } else {
      if (isChief) {
        setChiefData((prev) => ({ ...prev, [name]: value }));
      } else {
        setHallData((prev) => ({ ...prev, [name]: value }));
      }
    }
  };

  const checkIsProfileComplete = (profileData) => {
    if (!profileData) return false;
    if (isChief) {
      return (
        !!profileData.specialty &&
        !!profileData.city &&
        !!profileData.region &&
        !!profileData.price_per_hour &&
        !!profileData.capacity &&
        !!profileData.description
      );
    } else {
      return (
        !!profileData.hall_name &&
        !!profileData.city &&
        !!profileData.region &&
        !!profileData.price &&
        !!profileData.capacity &&
        !!profileData.description
      );
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await API.get("/provider/MyProfile");

      if (response.data.success && response.data.data) {
        const profileData = response.data.data;
        if (isChief) {
          setChiefData(profileData);
        } else {
          setHallData(profileData);
        }
        setIsProfileFilled(checkIsProfileComplete(profileData));
      } else {
        console.log("No existing profile found, starting fresh.");
        setIsProfileFilled(false);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error.message);
      toast.error(
        "Could not load your profile details. Check your connection.",
      );
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const submitProfile = async (e) => {
    e.preventDefault();
    if (!data.description || data.description.length < 20) {
      return toast.error("Description too short (min 20 chars).");
    }
    if (
      isChief &&
      data.start_year &&
      Number(data.start_year) > new Date().getFullYear()
    ) {
      return toast.error("Start year cannot be in the future.");
    }

    const priceValue = isChief
      ? Number(data.price_per_hour)
      : Number(data.price);
    const capacityValue = Number(data.capacity);

    if (
      isNaN(priceValue) ||
      priceValue <= 0 ||
      isNaN(capacityValue) ||
      capacityValue <= 0
    ) {
      return toast.error(
        "Please enter valid positive values for price and capacity.",
      );
    }

    setIsSubmitting(true);
    const loadingId = toast.loading("Saving your business profile...");
    try {
      const response = await API.post("/provider/businessAccount", data);
      if (response.data.success) {
        toast.success(response.data.message || "Saved successfully! ✨", {
          id: loadingId,
        });
        setIsProfileFilled(true);
        fetchProfile();
      } else {
        toast.error(response.data.message || "Failed to save details.", {
          id: loadingId,
        });
      }
    } catch (error) {
      console.error("Save error:", error);
      const errorMsg =
        error.response?.data?.message || "Server connection error.";
      toast.error(errorMsg, { id: loadingId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !user.role)
    return <div className={classes.loader}>Loading User...</div>;

  const hasExistingData = isChief
    ? !!chiefData.specialty
    : !!hallData.hall_name;

  return (
    <div className={classes.container}>
      <h2>Business Profile Setup</h2>
      <p>Hello {user.first_name}, please update your business details</p>
      <form className={classes.form} onSubmit={submitProfile}>
        <div className={classes.gridSection}>
          <h3>{isChief ? "Chief Details" : "Hall Details"}</h3>
          {relevantFields.map((field) => (
            <FormInput
              key={field.name}
              {...field}
              value={data[field.name] || ""}
              onChange={handleChange}
              disabled={isDisable}
            />
          ))}
        </div>

        <textarea
          placeholder="Detailed description of your services..."
          name="description"
          className={classes.textarea}
          value={data.description || ""}
          onChange={handleChange}
          minLength={20}
          required
          disabled={isDisable}
        />

        <button
          type="submit"
          className={classes.submitBtn}
          disabled={isSubmitting || isDisable}
        >
          {isSubmitting
            ? "Saving..."
            : hasExistingData
              ? "Update Details"
              : "Save & Submit"}
        </button>
      </form>
    </div>
  );
}
