import React, { useEffect, useState } from "react";
import API from "../../services/api";
import classes from "./servicesapprovals.module.css";
import BusinessProfile from "../shared/BusinessProfile/BusinessProfile";
import AppDialog from "../shared/AppDialog";
import AppModal from "../shared/AppModal";
import toast from "react-hot-toast";

export default function ServicesApprovals({ user, newType }) {
  const [type, setType] = useState(newType || "pending");
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);

  useEffect(() => {
    const fetchAllProviders = async () => {
      setLoading(true);
      try {
        const response = await API.get(`/admin/allServices/${type}`);
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

  async function handleStatusChange(id, provider_type, newStatus, reason = null) {
    try {
      const tableName = provider_type === "Chief" ? "chiefs" : "halls";
      const response = await API.post("/admin/approve-business", {
        type: tableName,
        id,
        newStatus,
        reason,
      });

      if (response.data.success) {
        toast.success(response.data.message || "Status updated successfully!");
        setProviders((prev) => prev.filter((p) => p.id !== id));
        setRejectTarget(null);
        setApproveTarget(null);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  }

  function getStatusClass(status) {
    const s = status?.toLowerCase();
    if (s === "pending") return classes.statusPending;
    if (s === "approved" || s === "approve") return classes.statusApproved;
    return classes.statusDeny;
  }

  const filteredProviders = providers.filter((p) => {
    const nameMatch = p.ServiceName?.toLowerCase().includes(
      searchTerm.toLowerCase(),
    );
    const emailMatch = p.email
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    return nameMatch || emailMatch;
  });

  return (
    <div className={classes.page}>
      <div className={classes.pageHeader}>
        <h2>Service Approvals</h2>
        <p>Review, approve, or deny provider service requests</p>
      </div>

      <div className={classes.toolbar}>
        <div className={classes.filterGroup}>
          <select
            className={classes.filterSelect}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="pending">Pending Services</option>
            <option value="approved">Approved Services</option>
            <option value="deny">Denied Services</option>
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

                  {type === "deny" && (
                    <td className={classes.reasonCell}>
                      {provider.rejection_reason || "N/A"}
                    </td>
                  )}

                  <td>
                    <div className={classes.actionBtns}>
                      <button
                        className={classes.showBtn}
                        onClick={() => setSelectedProvider(provider)}
                      >
                        View Profile
                      </button>
                      {type !== "approved" && (
                        <button
                          className={classes.approveBtn}
                          onClick={() => setApproveTarget(provider)}
                        >
                          Approve
                        </button>
                      )}
                      {type !== "deny" && (
                        <button
                          className={classes.denyBtn}
                          onClick={() => setRejectTarget(provider)}
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

      <AppModal
        open={!!selectedProvider}
        title={selectedProvider?.ServiceName || "Business Profile"}
        subtitle={selectedProvider?.email}
        size="lg"
        onClose={() => setSelectedProvider(null)}
      >
        {selectedProvider && (
          <BusinessProfile user={user} provider={selectedProvider} />
        )}
      </AppModal>

      <AppDialog
        open={!!approveTarget}
        title="Approve service"
        message={`Approve "${approveTarget?.ServiceName}"?`}
        confirmLabel="Approve"
        onCancel={() => setApproveTarget(null)}
        onConfirm={() =>
          handleStatusChange(
            approveTarget.id,
            approveTarget.provider_type,
            "Approved",
          )
        }
      />

      <AppDialog
        open={!!rejectTarget}
        title="Reject service request"
        message={`Provide a reason for rejecting "${rejectTarget?.ServiceName}":`}
        confirmLabel="Confirm Rejection"
        danger
        withInput
        inputPlaceholder="Type the rejection reason here..."
        onCancel={() => setRejectTarget(null)}
        onConfirm={(reason) =>
          handleStatusChange(
            rejectTarget.id,
            rejectTarget.provider_type,
            "Deny",
            reason,
          )
        }
      />
    </div>
  );
}
