// חילוץ תאריך מקומי YYYY-MM-DD
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

export const getTodayString = () => formatLocalDate(new Date());

// בדיקות תקינות הזמנים
export const validateTimes = (date, start, end) => {
  const todayStr = getTodayString();

  if (date < todayStr) {
    alert("You cannot select a date in the past!");
    return false;
  }
  if (date === todayStr) {
    const currentTime = formatLocalTime(new Date());
    if (start < currentTime) {
      alert("You cannot select a time that has already passed today!");
      return false;
    }
  }
  if (start < "08:00" || end > "24:00") {
    alert("Working hours are restricted between 08:00 and 24:00!");
    return false;
  }
  if (start >= end) {
    alert("End time must be strictly after the start time.");
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

  // 3. שעות עבודה מוגדרות (בין 08:00 ל-23:59)
  if (params.start_time && params.start_time < "08:00") {
    return "Start time cannot be earlier than 08:00!";
  }

  // 4. שעת סיום אחרי שעת התחלה
  if (params.start_time && params.end_time) {
    if (params.start_time >= params.end_time) {
      return "End time must be strictly after the start time!";
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
