import React, { useEffect, useState } from "react";
import API from "../../services/api";
import classes from "./servicesapprovals.module.css";
import BusinessProfile from "../shared/BusinessProfile/BusinessProfile";

export default function ServicesApprovals({ user, newType }) {
  const [type, setType] = useState("pending");
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);

  useEffect(() => {
    const fetchAllProviders = async () => {
      try {
        if (newType) setType(newType);
        let url = `/admin/allServices/${type}`;
        const response = await API.get(url);
        if (response.data.success) {
          setProviders(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchAllProviders();
  }, [type]);

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
      alert(response.data.message);
      setProviders((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }

  function getStatusClass(status) {
    const s = status?.toLowerCase();
    if (s === "pending") return classes.statusPending;
    if (s === "approved") return classes.statusApproved;
    return classes.statusDeny;
  }

  if (selectedProvider) {
    return (
      <div className={classes.detailView}>
        <button
          className={classes.backBtn}
          onClick={() => setSelectedProvider(null)}
        >
          Go Back
        </button>
        <BusinessProfile user={user} provider={selectedProvider} />
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <div className={classes.pageHeader}>
        <h2>Service Approvals</h2>
        <p>Review, approve, or deny provider service requests</p>
      </div>

      <div className={classes.toolbar}>
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

      {providers.length !== 0 ? (
        <div className={classes.tableContainer}>
          <table className={classes.customtable}>
            <thead>
              <tr>
                <th>Service Name & Provider</th>
                <th>Type</th>
                <th>Submitted Date</th>
                <th>Status</th>
                <th>Show Profile</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.id}>
                  <td>
                    {provider.ServiceName} " "
                    {provider.provider_type === "Hall_Owner"
                      ? provider.first_name
                      : ""}
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
                  <td>
                    <button
                      className={classes.showBtn}
                      onClick={() => setSelectedProvider(provider)}
                    >
                      View Details
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
                          onClick={() => {
                            const reason = prompt(
                              "Please enter the reason for rejection:",
                            );
                            if (reason === null) return; // האדמין לחץ על Cancel, לא עושים כלום
                            if (reason.trim() === "") {
                              alert("You must provide a reason for rejection.");
                              return;
                            }
                            handleStatusChange(
                              provider.id,
                              provider.provider_type,
                              "Deny",
                              reason,
                            );
                          }}
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
        <p className={classes.emptyState}>
          No services found for this category.
        </p>
      )}
    </div>
  );
}
