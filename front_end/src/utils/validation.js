// חילוץ תאריך מקומי YYYY-MM-DD
import toast from "react-hot-toast";

export const formatLocalDate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// חילוץ שעה מקומית HH:MM
export const formatLocalTime = (dateObj) => {
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const CALENDAR_DAY_START = "08:00";
export const CALENDAR_DAY_END = "24:00";

/** Booking deadlines (hours before event start) — keep in sync with backend bookingPolicy.js */
export const BOOKING_POLICY = {
  CREATE_MIN_HOURS: 6,
  PROVIDER_RESPONSE_HOURS: 4,
  CRITICAL_EDIT_HOURS: 48,
  PROVIDER_CHANGE_HOURS: 6,
  CANCEL_HOURS: 48,
};

export const hoursUntilEvent = (dateValue, timeValue) => {
  const dateStr = String(dateValue || "").split("T")[0];
  const timeStr = String(timeValue || "").slice(0, 5);
  if (!dateStr || !timeStr) return Number.NaN;
  const eventStart = new Date(`${dateStr}T${timeStr}`);
  if (Number.isNaN(eventStart.getTime())) return Number.NaN;
  return (eventStart.getTime() - Date.now()) / (1000 * 60 * 60);
};

export const meetsBookingHours = (dateValue, timeValue, minHours) => {
  const hoursLeft = hoursUntilEvent(dateValue, timeValue);
  return !Number.isNaN(hoursLeft) && hoursLeft >= minHours;
};

export const timeToMinutes = (time) => {
  const normalized = String(time).slice(0, 5);
  if (normalized === CALENDAR_DAY_END) return 24 * 60;
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
};

export const isTimeBefore = (start, end) =>
  timeToMinutes(start) < timeToMinutes(end);

/** FullCalendar ends midnight selections at next-day 00:00 — map that to 24:00. */
export const formatCalendarSelectEnd = (start, end) => {
  const startDate = formatLocalDate(start);
  const endDate = formatLocalDate(end);
  const endTime = formatLocalTime(end);

  if (endTime === "00:00" && endDate !== startDate) {
    const dayDiff =
      new Date(`${endDate}T00:00:00`).getTime() -
      new Date(`${startDate}T00:00:00`).getTime();
    if (dayDiff === 86400000) return CALENDAR_DAY_END;
  }

  return endTime;
};

/** FullCalendar event end ISO string (24:00 → next day 00:00 for display). */
export const calendarEventEndIso = (date, endTime) => {
  const normalized = String(endTime).slice(0, 5);
  if (normalized === CALENDAR_DAY_END) {
    const nextDay = new Date(`${date}T12:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    return `${formatLocalDate(nextDay)}T00:00:00`;
  }
  const withSeconds = normalized.length === 5 ? `${normalized}:00` : normalized;
  return `${date}T${withSeconds}`;
};

export const buildCalendarEndTimeOptions = () => {
  const options = [];
  for (let hour = 8; hour <= 23; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      if (hour === 8 && minute < 15) continue;
      options.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      );
    }
  }
  options.push(CALENDAR_DAY_END);
  return options;
};

export const getTodayString = () => formatLocalDate(new Date());

// בדיקות תקינות הזמנים
export const validateTimes = (date, start, end) => {
  const todayStr = getTodayString();

  if (date < todayStr) {
    toast.error("You cannot select a date in the past!");
    return false;
  }
  if (date === todayStr) {
    const currentTime = formatLocalTime(new Date());
    if (start < currentTime) {
      toast.error("You cannot select a time that has already passed today!");
      return false;
    }
  }
  if (
    start < CALENDAR_DAY_START ||
    timeToMinutes(end) > timeToMinutes(CALENDAR_DAY_END)
  ) {
    toast.error("Working hours are restricted between 08:00 and 24:00!");
    return false;
  }
  if (!isTimeBefore(start, end)) {
    toast.error("End time must be strictly after the start time.");
    return false;
  }
  return true;
};
/**
 * בדיקת תקינות מלאה עבור שדות החיפוש
 * מחזירה null אם הכל תקין, או מחרוזת טקסט עם הודעת השגיאה
 */
export const validateSearchParams = (params) => {
  const todayStr = getTodayString();
  const currentTime = formatLocalTime(new Date());

  // 1. בדיקת תאריך בעבר
  if (params.requested_date && params.requested_date < todayStr) {
    return "You cannot select a date in the past!";
  }

  // 2. בדיקת שעת התחלה שעברה היום
  if (
    params.requested_date === todayStr &&
    params.start_time &&
    params.start_time < currentTime
  ) {
    return "You cannot select a start time that has already passed today!";
  }

  // 2b. הזמנה לפחות 6 שעות לפני שעת ההתחלה
  if (params.requested_date && params.start_time) {
    const hoursUntilStart = hoursUntilEvent(
      params.requested_date,
      params.start_time,
    );

    if (
      !Number.isNaN(hoursUntilStart) &&
      hoursUntilStart < BOOKING_POLICY.CREATE_MIN_HOURS
    ) {
      return `Events must be booked at least ${BOOKING_POLICY.CREATE_MIN_HOURS} hours before the start time.`;
    }
  }

  // 3. שעות עבודה מוגדרות (בין 08:00 ל-23:59)
  if (params.start_time && params.start_time < "08:00") {
    return "Start time cannot be earlier than 08:00!";
  }

  // 4. שעת סיום אחרי שעת התחלה + משך מינימלי 30 דקות
  if (params.start_time && params.end_time) {
    if (params.start_time >= params.end_time) {
      return "End time must be strictly after the start time!";
    }

    const [startH, startM] = String(params.start_time)
      .slice(0, 5)
      .split(":")
      .map(Number);
    const [endH, endM] = String(params.end_time)
      .slice(0, 5)
      .split(":")
      .map(Number);
    const durationMinutes = endH * 60 + endM - (startH * 60 + startM);

    if (durationMinutes < 30) {
      return "Event duration must be at least 30 minutes.";
    }
  }

  // 5. בדיקת כמות אורחים (מספר חיובי בלבד)
  if (params.guest_number !== "" && Number(params.guest_number) <= 0) {
    return "Capacity/Guests must be a positive number!";
  }

  // 6. בדיקת מחיר (מספר שאינו שלילי)
  if (params.price !== "" && Number(params.price) < 0) {
    return "Price cannot be negative!";
  }

  return null; // הכל תקין!
};
