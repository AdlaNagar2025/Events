import React, { useEffect, useState } from "react";
import API from "../../services/api";
import classes from "./servicesapprovals.module.css";
import BusinessProfile from "../shared/BusinessProfile/BusinessProfile";

export default function ServicesApprovals({ user, newType }) {
  // 1. אתחול הסטייט עם newType במידה וקיים (מונע בלולאה ב-useEffect)
  const [type, setType] = useState(newType || "pending");
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // 2. סטייטים לחיפוש, טעינה ומודאל דחייה
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetProvider, setTargetProvider] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const fetchAllProviders = async () => {
      setLoading(true);
      try {
        const url = `/admin/allServices/${type}`;
        const response = await API.get(url);
        if (response.data.success) {
          setProviders(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching providers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProviders();
  }, [type]);

  // פונקציית עדכון סטטוס בשרת
  // async function handleStatusChange(
  //   id,
  //   provider_type,
  //   newStatus,
  //   reason = null,
  // ) {
  //   try {
  //     const tableName = provider_type === "Chief" ? "chiefs" : "halls";
  //     const response = await API.post("/admin/approve-business", {
  //       type: tableName,
  //       id,
  //       newStatus,
  //       reason,
  //     });

  //     // הסרת הפריט מהטבלה לאחר עדכון
  //     setProviders((prev) => prev.filter((p) => p.id !== id));

  //     // לסגור מודאל במידה והיה פתוח
  //     closeRejectModal();
  //   } catch (error) {
  //     console.error("Error updating status:", error);
  //     alert("Failed to update status. Please try again.");
  //   }
  // }

  async function handleStatusChange(
    id,
    provider_type,
    newStatus,
    reason = null,
  ) {
    try {
      const tableName = provider_type === "Chief" ? "chiefs" : "halls";
      const response = await API.post("/admin/approve-business", {
        type: tableName,
        id,
        newStatus,
        reason,
      });

      // בדיקה האם השרת החזיר success: true/false
      if (response.data.success) {
        alert(response.data.message || "Status updated successfully!");
        setProviders((prev) => prev.filter((p) => p.id !== id));
        closeRejectModal();
      } else {
        // כאן תיכנס ההודעה במידה ויש אירועים פעילים!
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  }

  // פתיחה וסגירה של מודאל הדחייה
  const openRejectModal = (provider) => {
    setTargetProvider(provider);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setTargetProvider(null);
    setRejectionReason("");
    setRejectModalOpen(false);
  };

  const handleConfirmReject = () => {
    handleStatusChange(
      targetProvider.id,
      targetProvider.provider_type,
      "Deny",
      rejectionReason,
    );
  };

  function getStatusClass(status) {
    const s = status?.toLowerCase();
    if (s === "pending") return classes.statusPending;
    if (s === "approved" || s === "approve") return classes.statusApproved;
    return classes.statusDeny;
  }

  // סינון הנתונים לפי תיבת החיפוש
  const filteredProviders = providers.filter((p) => {
    const nameMatch = p.ServiceName?.toLowerCase().includes(
      searchTerm.toLowerCase(),
    );
    const emailMatch = p.email
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    return nameMatch || emailMatch;
  });

  // אם נבחר פרופיל מסוים — מציגים את תצוגת הפרופיל המלא
  if (selectedProvider) {
    return (
      <div className={classes.detailView}>
        <button
          className={classes.backBtn}
          onClick={() => setSelectedProvider(null)}
        >
          ← Back to Approvals List
        </button>
        <BusinessProfile user={user} provider={selectedProvider} />
      </div>
    );
  }

  return (
    <div className={classes.page}>
      {/* כותרת הדף */}
      <div className={classes.pageHeader}>
        <h2>Service Approvals</h2>
        <p>Review, approve, or deny provider service requests</p>
      </div>

      {/* סרגל כלים: סינון סטטוס + תיבת חיפוש */}
      <div className={classes.toolbar}>
        <div className={classes.filterGroup}>
          <select
            className={classes.filterSelect}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="pending">⏳ Pending Services</option>
            <option value="approved">✅ Approved Services</option>
            <option value="deny">❌ Denied Services</option>
          </select>
        </div>

        <div className={classes.searchGroup}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={classes.searchInput}
          />
        </div>
      </div>

      {/* תצוגת טבלה / טעינה / ריק */}
      {loading ? (
        <div className={classes.loadingState}>Loading services...</div>
      ) : filteredProviders.length > 0 ? (
        <div className={classes.tableContainer}>
          <table className={classes.customtable}>
            <thead>
              <tr>
                <th>Service Name & Provider</th>
                <th>Type</th>
                <th>Submitted Date</th>
                <th>Status</th>
                {type === "deny" && <th>Rejection Reason</th>}
                <th>Show Profile</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProviders.map((provider) => (
                <tr key={provider.id}>
                  <td>
                    <div className={classes.providerCell}>
                      <strong>{provider.ServiceName}</strong>
                      <span className={classes.subText}>{provider.email}</span>
                    </div>
                  </td>
                  <td>
                    {provider.provider_type === "Hall_Owner"
                      ? "Venue"
                      : "Catering"}
                  </td>
                  <td>{provider?.submitted_at}</td>
                  <td>
                    <span
                      className={`${classes.statusBadge} ${getStatusClass(provider.status)}`}
                    >
                      {provider.status}
                    </span>
                  </td>

                  {/* הצגת סיבת דחייה אם הטאב הוא 'Denied' */}
                  {type === "deny" && (
                    <td className={classes.reasonCell}>
                      {provider.rejection_reason || "N/A"}
                    </td>
                  )}

                  <td>
                    <button
                      className={classes.showBtn}
                      onClick={() => setSelectedProvider(provider)}
                    >
                      View Profile
                    </button>
                  </td>
                  <td>
                    <div className={classes.actionBtns}>
                      {type !== "approved" && (
                        <button
                          className={classes.approveBtn}
                          onClick={() =>
                            handleStatusChange(
                              provider.id,
                              provider.provider_type,
                              "Approved",
                            )
                          }
                        >
                          Approve
                        </button>
                      )}
                      {type !== "deny" && (
                        <button
                          className={classes.denyBtn}
                          onClick={() => openRejectModal(provider)}
                        >
                          Deny
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={classes.emptyState}>
          <p>No services found for this category.</p>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* 🎨 Custom Modal: מודאל מעוצב לקבלת סיבת דחייה */}
      {/* -------------------------------------------------- */}
      {rejectModalOpen && (
        <div className={classes.modalOverlay}>
          <div className={classes.modalContent}>
            <h3>Reject Service Request</h3>
            <p>
              Please provide a reason for rejecting{" "}
              <strong>{targetProvider?.ServiceName}</strong>:
            </p>
            <textarea
              className={classes.modalTextarea}
              rows="4"
              placeholder="Type the rejection reason here..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className={classes.modalActions}>
              <button className={classes.cancelBtn} onClick={closeRejectModal}>
                Cancel
              </button>
              <button
                className={classes.confirmDenyBtn}
                onClick={handleConfirmReject}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
