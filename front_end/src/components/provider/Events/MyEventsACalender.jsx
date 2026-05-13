import React from "react";
import MyBooking from "../../customer/MYEVENTS/MyBooking";
import Calendar from "../../BasicToProviderProfile/Calendar/Calendar";
import { useState } from "react";

export default function MyEventsACalender({ user }) {
  const [refreshKey, setRefreshKey] = useState(0);

  // פונקציה שתקרא בכל פעם שקורה שינוי ב-Booking
  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div>
      {/* ה-key גורם לרינדור מחדש של היומן כשהוא משתנה */}
      <Calendar key={refreshKey} role={user.role} user={user} />
      
      {/* מעבירים את הפונקציה ל-MyBooking כדי שיוכל לקרוא לה אחרי שינוי סטטוס */}
      <MyBooking user={user} onStatusChange={triggerRefresh} />
    </div>
  );
}
