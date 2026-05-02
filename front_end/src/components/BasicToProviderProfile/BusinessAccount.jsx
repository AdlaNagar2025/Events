import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import classes from "./BusinessAccount.module.css";
import FormInput from "../BasicToProviderProfile/FormInput";
import ImageUpload from "../BasicToProviderProfile/ImagesCode/ImageUpload"; // וודאי שהנתיב הזה נכון אצלך

const initialChief = {
  specialty: "",
  phone: "",
  price_per_hour: "",
  start_year: "",
  description: "",
  capacity: "",
  city: "",
  street: "",
};

const initialHall = {
  hall_name: "",
  city: "",
  street: "",
  price: "",
  phone: "",
  capacity: "",
  email: "",
  description: "",
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
  { label: "Start Year", name: "start_year", type: "number", required: false },
  { label: "Max Capacity", name: "capacity", type: "number", required: true },
  {
    label: "Phone",
    name: "phone",
    type: "tel",
    required: true,
    extraProps: { pattern: "^05\\d{8}$" },
  },
  { label: "City", name: "city", required: true },
  { label: "Street", name: "street", required: false },
];

const HALL_FIELDS = [
  { label: "Hall Name", name: "hall_name", required: true },
  { label: "Price", name: "price", type: "number", required: true },
  { label: "Email", name: "email", type: "email", required: true },
  {
    label: "Phone",
    name: "phone",
    type: "tel",
    required: true,
    extraProps: { pattern: "^05\\d{8}$" },
  },
  { label: "Capacity", name: "capacity", type: "number", required: true },
  { label: "City", name: "city", required: true },
  { label: "Street", name: "street", required: false },
];

export default function BusinessAccount({ user, isDisable }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chiefData, setChiefData] = useState(initialChief);
  const [hallData, setHallData] = useState(initialHall);

  const isChief = user?.role === "Chief";
  const data = isChief ? chiefData : hallData;
  const relevantFields = isChief ? CHIEF_FIELDS : HALL_FIELDS;
  if (!user || !user.role)
    return <div className={classes.loader}>Loading User...</div>;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (isChief) setChiefData((prev) => ({ ...prev, [name]: value }));
    else setHallData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchProfile = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3030/provider/MyProfile",
        { withCredentials: true },
      );

      if (response.data.success && response.data.data) {
        if (isChief) {
          setChiefData(response.data.data);
        } else {
          setHallData(response.data.data);
        }
      } else {
        console.log("No existing profile found, starting fresh.");
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
    if (data.description.length < 20) {
      return toast.error("Description too short (min 20 chars).");
    }
    if (
      isChief &&
      data.start_year &&
      data.start_year > new Date().getFullYear()
    ) {
      return toast.error("Year cannot be in the future.");
    }
    const priceValue = isChief ? data.price_per_hour : data.price;
    if (priceValue <= 0 || data.capacity <= 0) {
      return toast.error(
        "Please enter valid positive values for price and capacity.",
      );
    }
    setIsSubmitting(true);
    const loadingId = toast.loading("Saving your business profile...");
    try {
      const response = await axios.post(
        "http://localhost:3030/provider/businessAccount",
        data,
        { withCredentials: true },
      );
      if (response.data.success) {
        toast.success(response.data.message || "Saved successfully! ✨", {
          id: loadingId,
        });
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
  if (!user) return <div className={classes.loader}>Loading...</div>;

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
