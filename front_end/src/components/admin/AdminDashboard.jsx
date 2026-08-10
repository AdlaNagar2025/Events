import React, { useState, useEffect } from "react";
import API from "../../services/api";
import classes from "./servicesapprovals.module.css";
import umClasses from "./usersmanagment.module.css";
import ContentModeration from "./ContentModeration";
import ServicesApprovals from "./ServicesApprovals";

export default function AdminDashboard({ user }) {
  const [userStats, setUserStatas] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newRegistrations: 0,
  });

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await API.get("/admin/userStats");
        if (response.data && response.data.data) {
          setUserStatas(response.data.data);
        }
      } catch (error) {
        console.log("Error fetching stats:", error);
      }
    };

    fetchUserStats();
  }, []);

  return (
    <div className={classes.dashboardPage}>
      <section className={classes.dashboardSection}>
        <ServicesApprovals user={user} newType="pending" />
      </section>

      <section className={classes.dashboardSection}>
        <div className={umClasses.statsGrid}>
          <div className={umClasses.statCard}>
            <span className={umClasses.statLabel}>Total Users</span>
            <span className={umClasses.statValue}>{userStats.totalUsers}</span>
          </div>
          <div className={umClasses.statCard}>
            <span className={umClasses.statLabel}>Active Users</span>
            <span className={umClasses.statValue}>{userStats.activeUsers}</span>
          </div>
          <div className={umClasses.statCard}>
            <span className={umClasses.statLabel}>Inactive Users</span>
            <span className={umClasses.statValue}>
              {userStats.inactiveUsers}
            </span>
          </div>
          <div className={umClasses.statCard}>
            <span className={umClasses.statLabel}>New Registrations</span>
            <span className={umClasses.statValue}>
              {userStats.newRegistrations}
            </span>
          </div>
        </div>
      </section>

      <section className={classes.dashboardSection}>
        <ContentModeration newUrl="/admin/allPendingReports" />
      </section>
    </div>
  );
}
