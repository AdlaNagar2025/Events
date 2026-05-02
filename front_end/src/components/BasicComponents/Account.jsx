import axios from "axios";
import { useState, useEffect } from "react";
import classes from "./account.module.css";
import { useNavigate } from "react-router-dom";
/**
 * Account Component - מאפשרת למשתמש לצפות ולעדכן את פרטי הפרופיל האישי שלו.
 */
export default function Account({ user, onUpdateSuccess }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user?.first_name,
        last_name: user?.last_name,
        email: user?.email,
        phone: user?.phone,
      });
    }
  }, [user]);
  if (!user) {
    return <p>Loading...</p>;
  }
  /**
   * handleInputChange - מעדכנת את ה-State המקומי בכל פעם שהמשתמש מקליד בטופס.
   * משתמשת בשדה ה-name של ה-input כדי לדעת איזה ערך לעדכן.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  /**
   * handleProfileUpdate - שולחת בקשת PUT לשרת עם הנתונים החדשים ומעדכנת את ה-State הגלובלי בהצלחה.
   */
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(
        "http://localhost:3030/user/updateProfile",
        formData,
        { withCredentials: true }, // חובה לשליחת ה-Session Cookie לשרת
      );

      if (response.data.success) {
        alert(response.data.message);
        onUpdateSuccess(response.data.updatedUser);
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  return (
    <div className={classes.accountContainer}>
      <div>
        <p>Welcome Back {user?.first_name}! Update your account information:</p>

        <form className={classes.form} onSubmit={handleProfileUpdate}>
          <h2>Update Form:</h2>
          <input
            type="text"
            placeholder="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
          />
          <input
            type="text"
            placeholder="last_name"
            value={formData.last_name}
            name="last_name"
            onChange={handleInputChange}
          />
          <input
            type="email"
            placeholder="email"
            value={formData.email}
            name="email"
            onChange={handleInputChange}
          />
          <input
            type="tel"
            value={formData.phone}
            pattern="^05[023458]\d{7}$"
            placeholder="phone"
            name="phone"
            onChange={handleInputChange}
          />
          <button type="submit" className={classes.updateBtn}>
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
