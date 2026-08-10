import { useState, useEffect } from "react";
import API from "../../../services/api";
import { formatLocalDate, validateTimes } from "../../../utils/validation";
import toast from "react-hot-toast";

export const useCalendar = (role, user) => {
  const [availableData, setAvailableData] = useState({
    available_date: "",
    start_time: "",
    end_time: "",
  });
  const [loading, setLoading] = useState(false);
  const [worksHour, setWorksHour] = useState([]);
  const [events, setEvents] = useState([]);

  const fetchAvailability = async () => {
    try {
      const url =
        role === "Chief" || role === "Hall_Owner"
          ? "/provider/getMyCalendar"
          : `/${role.toLowerCase()}/ProviderCalendar/${user?.id}`;

      const response = await API.get(url);
      if (response.data.success) {
        const dataFromDB = response.data.data || [];
        const formatted = dataFromDB.map((item) => {
          const localDate = formatLocalDate(new Date(item.available_date));
          const cleanStart = item.start_time.substring(0, 5);
          const cleanEnd = item.end_time.substring(0, 5);

          return {
            title: "🟢 Available",
            start: `${localDate}T${cleanStart}`,
            end: `${localDate}T${cleanEnd}`,
            backgroundColor: "#28a745",
            borderColor: "#68c47e",
            allDay: false,
            extendedProps: {
              rawDate: localDate,
              startTime: cleanStart,
              endTime: cleanEnd,
              isSlot: true,
            },
          };
        });
        setWorksHour(formatted);
      }
    } catch (error) {
      console.error("Error fetching calendar:", error);
      setWorksHour([]);
    }
  };

  const fetchApprovedEvents = async () => {
    try {
      const url =
        role === "Chief" || role === "Hall_Owner"
          ? "/provider/AllEventsApproved"
          : `/${role.toLowerCase()}/ProviderEvents/${user?.id}`;

      const response = await API.get(url);
      const dataFromDB = response.data.data || [];
      const formatted = dataFromDB.map((item) => {
        const localDate = formatLocalDate(new Date(item.requested_date));
        const cleanStart = item.start_time.substring(0, 5);
        const cleanEnd = item.end_time.substring(0, 5);

        return {
          title: "Event",
          start: `${localDate}T${cleanStart}`,
          end: `${localDate}T${cleanEnd}`,
          backgroundColor: "#2889a7",
          borderColor: "#c4687f",
          allDay: false,
          extendedProps: { isSlot: false },
        };
      });
      setEvents(formatted);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    }
  };

  useEffect(() => {
    fetchAvailability();
    fetchApprovedEvents();
  }, []);

  const handleSave = async () => {
    const { available_date, start_time, end_time } = availableData;
    if (!available_date || !start_time || !end_time) {
      toast.error("Please select a valid time slot first.");
      return;
    }
    if (!validateTimes(available_date, start_time, end_time)) return;

    setLoading(true);
    try {
      const res = await API.post("/provider/fillCalendar", availableData);
      if (res.data.success) {
        toast.success("Availability saved successfully! ✨");
        resetForm();
        fetchAvailability();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to remove this availability?"))
      return;

    setLoading(true);
    try {
      const res = await API.post("/provider/updateCalendar", availableData);
      if (res.data.success) {
        toast.success("Availability removed successfully! 🗑️");
        resetForm();
        fetchAvailability();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () =>
    setAvailableData({ available_date: "", start_time: "", end_time: "" });

  const isSlotExisting = worksHour.some((slot) => {
    const slotDate = slot.start.split("T")[0];
    const slotStart = slot.start.split("T")[1].substring(0, 5);
    const slotEnd = slot.end.split("T")[1].substring(0, 5);

    return (
      slotDate === availableData.available_date &&
      slotStart <= availableData.start_time &&
      slotEnd >= availableData.end_time
    );
  });

  return {
    availableData,
    setAvailableData,
    loading,
    allEvents: [...worksHour, ...events],
    isSlotExisting,
    handleSave,
    handleDelete,
    resetForm,
  };
};
