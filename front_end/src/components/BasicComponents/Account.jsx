import API from "../../services/api";
import { useState, useEffect } from "react";
import classes from "./account.module.css";

function getRoleLabel(role) {
  switch (role) {
    case "Hall_Owner":
      return "Hall Owner";
    case "Chief":
      return "Chef";
    default:
      return role;
  }
}

function getStatusClass(status) {
  const s = status?.toUpperCase();
  if (s === "APPROVED") return classes.statusApproved;
  if (s === "DENY") return classes.statusDeny;
  return classes.statusPending;
}

export default function Account({ user, onUpdateSuccess }) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        email: user?.email || "",
        phone: user?.phone || "",
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (success) setSuccess("");
    if (error) setError("");
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await API.put("/user/updateProfile", formData);

      if (response.data.success) {
        setSuccess(response.data.message || "Profile updated successfully!");
        const updated = response.data.updatedUser || formData;
        onUpdateSuccess({ ...user, ...updated });
      } else {
        setError(response.data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Update error:", err);
      const serverMsg =
        err.response?.data?.message ||
        "Failed to update profile. Please try again.";
      setError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className={classes.loading}>
        <div className={classes.spinner} />
        Loading your account...
      </div>
    );
  }

  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`;
  const isProvider = user.role === "Chief" || user.role === "Hall_Owner";

  return (
    <div className={classes.page}>
      <div className={classes.pageHeader}>
        <h1>My Account</h1>
        <p>View and update your personal information</p>
      </div>

      <div className={classes.layout}>
        <div className={classes.profileCard}>
          <div className={classes.avatar}>{initials}</div>
          <p className={classes.profileName}>
            {user.first_name} {user.last_name}
          </p>
          <p className={classes.profileEmail}>{user.email}</p>
          <span className={classes.roleBadge}>{getRoleLabel(user.role)}</span>
          {isProvider && user.status && (
            <span
              className={`${classes.statusBadge} ${getStatusClass(user.status)}`}
            >
              Status: {user.status}
            </span>
          )}
        </div>

        <div className={classes.formCard}>
          <h2 className={classes.formTitle}>Profile Details</h2>
          <p className={classes.formSubtitle}>
            Keep your contact information up to date
          </p>

          {success && (
            <div className={classes.successAlert} role="status">
              <p>{success}</p>
            </div>
          )}

          {error && (
            <div className={classes.errorAlert} role="alert">
              <p>{error}</p>
            </div>
          )}

          <form className={classes.form} onSubmit={handleProfileUpdate}>
            <div className={classes.nameRow}>
              <div className={classes.fieldGroup}>
                <label htmlFor="first_name">First Name</label>
                <input
                  id="first_name"
                  type="text"
                  placeholder="First name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className={classes.fieldGroup}>
                <label htmlFor="last_name">Last Name</label>
                <input
                  id="last_name"
                  type="text"
                  placeholder="Last name"
                  value={formData.last_name}
                  name="last_name"
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className={classes.fieldGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                name="email"
                onChange={handleInputChange}
                required
              />
            </div>

            <div className={classes.fieldGroup}>
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                pattern="^05[023458]\d{7}$"
                placeholder="0501234567"
                name="phone"
                onChange={handleInputChange}
              />
            </div>

            <button
              type="submit"
              className={classes.updateBtn}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
