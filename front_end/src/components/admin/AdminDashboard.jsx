import React, { useState, useEffect } from "react";
import API from "../../services/api";
import classes from "./servicesapprovals.module.css";
import { Link } from "react-router-dom";

export default function AdminDashboard({ user }) {
  const [pendingServices, setPendingServices] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [summaryStats, setSummaryStats] = useState({});

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
        console.error("Error fetching pending reports:", error);
      }
    };

    const fetchSummaryStats = async () => {
      try {
        const response = await API.get("/admin/summaryStats");
        setSummaryStats(response.data.data || {});
      } catch (error) {
        console.error("Error fetching summary stats:", error);
      }
    };

    fetchPendingServices();
    fetchPendingReports();
    fetchSummaryStats();
  }, []);

  const stats = [
    { label: "Total Events", value: summaryStats.allEvents },
    { label: "Approved", value: summaryStats.approvedEvents },
    { label: "Rejected", value: summaryStats.rejectedEvents },
    { label: "Pending", value: summaryStats.pendingEvents },
    { label: "Cancelled", value: summaryStats.cancelledEvents },
  ];

  return (
    <div className={classes.dashboardPage}>
      <section className={classes.dashboardStats} aria-label="Summary stats for this month">
        <h2 className={classes.dashboardBlockTitle}>This month</h2>
        <div className={classes.dashboardStatsGrid}>
          {stats.map((stat) => (
            <div key={stat.label} className={classes.dashboardStatCard}>
              <span className={classes.dashboardStatLabel}>{stat.label}</span>
              <span className={classes.dashboardStatValue}>
                {stat.value ?? 0}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className={classes.dashboardAttention}>
        <section className={`${classes.dashboardSection} ${classes.dashboardSectionServices}`}>
          <h2 className={classes.dashboardBlockTitle}>Pending services</h2>
          {pendingServices.length === 0 ? (
            <p className={classes.dashboardEmpty}>No pending services</p>
          ) : (
            pendingServices.map((pendingService) => (
              <div key={pendingService.id}>
                <h3>{pendingService.first_name}</h3>
                <p>{pendingService.provider_type}</p>
                <p>{pendingService.ServiceName}</p>
                <p>{pendingService.submitted_at}</p>
              </div>
            ))
          )}
          <Link className={classes.dashboardViewAll} to="/admin/services-approvals">
            View all services
          </Link>
        </section>

        <section className={`${classes.dashboardSection} ${classes.dashboardSectionReports}`}>
          <h2 className={classes.dashboardBlockTitle}>Pending reports</h2>
          {pendingReports.length === 0 ? (
            <p className={classes.dashboardEmpty}>No pending reports</p>
          ) : (
            pendingReports.map((pendingReport) => (
              <div key={pendingReport.id}>
                <h3>{pendingReport.reporter_name}</h3>
                <p>{pendingReport.reported_name}</p>
                <p>{pendingReport.reason}</p>
                <p>{pendingReport.description}</p>
              </div>
            ))
          )}
          <Link className={classes.dashboardViewAll} to="/admin/content-moderation">
            View all reports
          </Link>
        </section>
      </div>
    </div>
  );
}
