import React, { useEffect, useState } from "react";
import axios from "axios";
import classes from "./servicesapprovals.module.css";
import BusinessProfile from "../CommonComponents/BusinessProfile";

export default function ServicesApprovals({user}) {
  const [type, setType] = useState("pending");
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  useEffect(() => {
    console.log(user)
    const fetchAllProviders = async () => {
      try {
        let url = `http://localhost:3030/admin/allServices/${type}`;
        const response = await axios.get(url, { withCredentials: true });
        if (response.data.success) {
          setProviders(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchAllProviders();
  }, [type]);
  console.log(providers);

  async function handleStatusChange(id, provider_type, newStatus) {
    try {
      const tableName = provider_type === "Chief" ? "chiefs" : "halls";
      const response = await axios.post(
        "http://localhost:3030/admin/approve-business",
        { type: tableName, id, newStatus },
        { withCredentials: true },
      );
      // if (response.data.success) {
      //  //TGEEER STATUS IN TABLE DISABLE
      // }
      alert(response.data.message);
      setProviders((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }

  if (selectedProvider) {
    return (
      <div>
        <button onClick={() => setSelectedProvider(null)}>Go Back</button>
        <BusinessProfile user={user} provider={selectedProvider} />
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <h2>Service Approvals Management</h2>
      <select
        className={classes.filterSelect}
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="pending">⏳ Pending Services</option>
        <option value="approved">✅ Approved Services</option>
        <option value="deny">❌ Denied Services</option>
      </select>

      {providers.length !== 0 ? (
        <div className={classes.tableContainer}>
        <table className={classes.customtable}>
          <thead>
            <tr>
              <th>Provider Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Show Profile</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider.id}>
                <td>{provider.first_name}</td>
                <td>{provider.provider_type}</td>
              
                <td>  <span style={{ color: provider.status === 'pending' ? '#f39c12' : '#27ae60' }}>
                     {provider.status}
                   </span></td>
                <td>
                  <button className={classes.showBtn} onClick={() => setSelectedProvider(provider)}>
                   View Details
                  </button>
                </td>
                  <td>
                  <div className={classes.actionBtns}>
                    <button
                      className={classes.approveBtn}
                      onClick={() => handleStatusChange(provider.id, provider.provider_type, "Approved")}
                    >
                      Approve
                    </button>
                    <button
                      className={classes.denyBtn}
                      onClick={() => handleStatusChange(provider.id, provider.provider_type, "Deny")}
                    >
                      Deny
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ):(<p style={{ textAlign: 'center', color: '#777' }}>No services found for this category.</p>)
    }
    </div>
  );
}
