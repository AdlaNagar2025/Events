import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import classes from "./adduser.module.css";

export default function AddUser() {
  const navigate = useNavigate();

  // ניהול הסטייט של הטופס באובייקט אחד
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "Customer", // ערך ברירת מחדל
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // עדכון הסטייט בצורה דינמית לפי ה-name של האינפוט
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(false);

    // בדיקת תקינות בסיסית (ולידציה)
    if (
      !formData.first_name ||
      !formData.last_name ||
      !formData.email ||
      !formData.password
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      // שליחת הנתונים לשרת שלך (תוודא שה-URL והנתיב נכונים ב-Backend)
      const response = await axios.post(
        "http://localhost:3030/admin/addUser",
        formData,
        { withCredentials: true },
      );

      if (response.data.success) {
        alert("User added successfully!");
        navigate("/usersmanagment"); // ניווט חזרה לדף ניהול המשתמשים
      } else {
        setError(response.data.message || "Failed to add user.");
      }
    } catch (err) {
      console.error("Error adding user:", err);
      setError(
        err.response?.data?.message || "An error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.container}>
      <h2 className={classes.title}>Add New User</h2>

      {error && <div className={classes.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className={classes.formGroup}>
          <label>First Name:</label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            className={classes.input}
            placeholder="John"
          />
        </div>

        <div className={classes.formGroup}>
          <label>Last Name:</label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            className={classes.input}
            placeholder="Doe"
          />
        </div>

        <div className={classes.formGroup}>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={classes.input}
            placeholder="john.doe@example.com"
          />
        </div>

        <div className={classes.formGroup}>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={classes.input}
            placeholder="••••••••"
          />
        </div>

        <div className={classes.formGroup}>
          <label>Role:</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className={classes.select}
          >
            <option value="Admin">Admin</option>
            <option value="Chief">Chief</option>
            <option value="Hall_Owner">Hall Owner</option>
            <option value="Customer">Customer</option>
          </select>
        </div>

        <div className={classes.btnContainer}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={classes.cancelBtn}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={classes.submitBtn}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add User"}
          </button>
        </div>
      </form>
    </div>
  );
}
