import React, { useState, useEffect } from "react";
import API from "../../services/api";
import classes from "./servicesapprovals.module.css";

export default function AdminDashboard({ user }) {
  const [pendingServices, setPendingServices] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);

  useEffect(() => {
    const fetchPendingServices = async () => {
      try {
        const response = await API.get("/admin/allServices/PENDING/5");
        setPendingServices(response.data.data || []);
      } catch (error) {
        console.error("Error fetching pending services:", error);
      }
    };

    const fetchPendingReports = async () => {
      try {
        const response = await API.get("/admin/allReports/PENDING/5");
        setPendingReports(response.data.data || []);
      } catch (error) {
        console.error("Error fetching pending services:", error);
      }
    };
    fetchPendingServices();
    fetchPendingReports();
  }, []);
  console.log(pendingReports)

  return (
    <div className={classes.dashboardPage}>
      <section className={classes.dashboardSection}>
      {pendingServices.map((pendingService)=>{
        return (
          <div key={pendingService.id}>
          <h3>{pendingService.first_name} </h3>
          <p>{pendingService.provider_type}</p>
          <p>{pendingService.ServiceName}</p>
          <p>{pendingService.submitted_at}</p>
          </div>
        )
      })}
      </section>

      <section className={classes.dashboardSection}>
      {pendingReports.map((pendingReport)=>{
        return (
          <div key={pendingReport.id}>
          <h3>{pendingReport.reporter_name} </h3>
          <p>{pendingReport.reported_name}</p>
          <p>{pendingReport.reason}</p>
          <p>{pendingReport.description}</p>
          </div>
        )
      })}
      </section>

 
      <section className={classes.dashboardSection}>
      </section>
    </div>
  );
}
