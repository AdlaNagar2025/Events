import { useState, useEffect } from "react";
import API from "../../../services/api";
import {
  formatLocalDate,
  validateTimes,
  calendarEventEndIso,
} from "../../../utils/validation";
import toast from "react-hot-toast";

function buildFreeEvent(date, startTime, endTime) {
  const cleanStart = String(startTime).slice(0, 5);
  const cleanEnd = String(endTime).slice(0, 5);
  return {
    title: "Free",
    start: `${date}T${cleanStart}`,
    end: calendarEventEndIso(date, cleanEnd),
    backgroundColor: "rgba(201, 162, 39, 0.18)",
    borderColor: "rgba(201, 162, 39, 0.55)",
    textColor: "#8a6f14",
    classNames: ["fc-available"],
    allDay: false,
    extendedProps: {
      rawDate: date,
      startTime: cleanStart,
      endTime: cleanEnd,
      isSlot: true,
    },
  };
}

/** Cut booked hours out of Free blocks so only navy Booked shows in those times. */
function subtractBookingsFromFree(freeSlots, bookedSlots) {
  let remaining = freeSlots.map((slot) => ({
    date: slot.extendedProps.rawDate,
    start: slot.extendedProps.startTime,
    end: slot.extendedProps.endTime,
  }));

  bookedSlots.forEach((booking) => {
    const bookDate = booking.start.split("T")[0];
    const bookStart = booking.start.split("T")[1].substring(0, 5);
    const bookEnd = booking.end.split("T")[1].substring(0, 5);

    const next = [];
    remaining.forEach((block) => {
      if (block.date !== bookDate) {
        next.push(block);
        return;
      }

      if (bookEnd <= block.start || bookStart >= block.end) {
        next.push(block);
        return;
      }

      if (block.start < bookStart) {
        next.push({ date: block.date, start: block.start, end: bookStart });
      }
      if (block.end > bookEnd) {
        next.push({ date: block.date, start: bookEnd, end: block.end });
      }
    });
    remaining = next;
  });

  return remaining
    .filter((block) => block.start < block.end)
    .map((block) => buildFreeEvent(block.date, block.start, block.end));
}

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
          return buildFreeEvent(localDate, cleanStart, cleanEnd);
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
          title: "Booked",
          start: `${localDate}T${cleanStart}`,
          end: `${localDate}T${cleanEnd}`,
          backgroundColor: "#1e3a5f",
          borderColor: "#152a45",
          textColor: "#ffffff",
          classNames: ["fc-booking"],
          display: "block",
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

    if (available_date_end && available_date_end < available_date) {
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

  const visibleFreeSlots = subtractBookingsFromFree(worksHour, events);

  const isSlotExisting = visibleFreeSlots.some((slot) => {
    const slotDate = slot.extendedProps.rawDate;
    const slotStart = slot.extendedProps.startTime;
    const slotEnd = slot.extendedProps.endTime;

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
    allEvents: [...visibleFreeSlots, ...events],
    isSlotExisting,
    handleSave,
    handleDelete,
    resetForm,
  };
};
