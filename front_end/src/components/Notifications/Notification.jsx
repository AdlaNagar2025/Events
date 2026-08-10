import { useState, useEffect } from "react";
import API from "../../services/api";

export default function Notification({ user }) {
  const [messages, setMessages] = useState([]);

  // 1. פונקציה קטנה שמחזירה את שם הראוט המתאים לפי התפקיד של המשתמש
  const getRoleEndpoint = () => {
    const currentRole = user?.role;
    if (currentRole === "Chief" || currentRole === "Hall_Owner") {
      return "provider";
    }
    return currentRole ? currentRole.toLowerCase() : "";
  };

  const endpointRole = getRoleEndpoint();

  const fetchAllNotifications = async () => {
    if (!endpointRole) return; 

    try {
      const response = await API.get(
        `/${endpointRole}/MyNotifications`,
      );
      setMessages(response.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleChangeNotification = async (notificationId) => {
    if (!endpointRole) return;

    try {
      await API.put(
        `/${endpointRole}/updateNotification/${notificationId}`,
        {},
      );
      fetchAllNotifications(); 
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchAllNotifications();
  }, [user]); 

  return (
    <div>
      {messages.map((msg) => (
        <p
          key={msg.notification_id} // תיקון: תואם לשם השדה ב-SQL
          className={msg.isRead === 0 ? "Red" : "Green"} // תיקון: הוספת גרשיים
          onMouseEnter={() => handleChangeNotification(msg.notification_id)} // תיקון: תואם לשם השדה ב-SQL
          style={{
            cursor: "pointer",
            padding: "5px",
            borderBottom: "1px solid #ccc",
          }} 
        >
          {msg.message}
        </p>
      ))}
    </div>
  );
}
