import { useState, useEffect } from "react";
import API from "../../../services/api";
import { formatLocalDate, validateTimes } from "../../../utils/validation";
import toast from "react-hot-toast";

export const useCalendar = (role, user) => {
  const [availableData, setAvailableData] = useState({
  available_date: "",
  available_date_end: "",
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
            title: "Available",
            start: `${localDate}T${cleanStart}`,
            end: `${localDate}T${cleanEnd}`,
            backgroundColor: "#c9a227",
            borderColor: "#b8921f",
            classNames: ["fc-available"],
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
          backgroundColor: "#1e3a5f",
          borderColor: "#2c4a6e",
          classNames: ["fc-booking"],
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
  const { available_date, available_date_end, start_time, end_time } =
    availableData;

  if (!available_date || !start_time || !end_time) {
    toast.error("Please select a valid time slot first.");
    return;
  }

  if (
    available_date_end &&
    available_date_end < available_date
  ) {
    toast.error("End date must be on or after the start date.");
    return;
  }

  if (!validateTimes(available_date, start_time, end_time)) return;

  setLoading(true);
  try {
    const res = await API.post("/provider/fillCalendar", availableData);
    if (res.data.success) {
      toast.success(res.data.message || "Availability saved successfully! ✨");
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
    setLoading(true);
    try {
      const res = await API.post("/provider/updateCalendar", availableData);
      if (res.data.success) {
        toast.success(
          res.data.message || "Availability removed successfully! 🗑️",
        );
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
    setAvailableData({
      available_date: "",
      available_date_end: "",
      start_time: "",
      end_time: "",
    });

  const rangeStart = availableData.available_date;
  const rangeEnd =
    availableData.available_date_end &&
    availableData.available_date_end !== availableData.available_date
      ? availableData.available_date_end
      : availableData.available_date;

  const isSlotExisting = worksHour.some((slot) => {
    const slotDate = slot.start.split("T")[0];
    const slotStart = slot.start.split("T")[1].substring(0, 5);
    const slotEnd = slot.end.split("T")[1].substring(0, 5);

    if (!rangeStart || slotDate < rangeStart || slotDate > rangeEnd) {
      return false;
    }

    return (
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
