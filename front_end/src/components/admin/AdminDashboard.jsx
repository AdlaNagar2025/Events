import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import classes from "./usersmanagment.module.css";
import ContentModeration from "./ContentModeration";
import ServicesApprovals from "./ServicesApprovals";

export default function AdminDashboard({ user }) {
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStatas] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newRegistrations: 0,
  });

  useEffect(() => {
    const fetchUserStats = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          "http://localhost:3030/admin/userStats",
          {
            withCredentials: true,
          },
        );

        if (response.data && response.data.data) {
          setUserStatas(response.data.data);
        }
      } catch (error) {
        console.log("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);
  return (
    <div>
      <ServicesApprovals user={user} newType="pending" />
      <div className={classes.statsGrid}>
        <div className={classes.statCard}>
          <span className={classes.statLabel}>Total Users</span>
          <span className={classes.statValue}>{userStats.totalUsers}</span>
        </div>
        <div className={classes.statCard}>
          <span className={classes.statLabel}>Active Users</span>
          <span className={classes.statValue}>{userStats.activeUsers}</span>
        </div>
        <div className={classes.statCard}>
          <span className={classes.statLabel}>Inactive Users</span>
          <span className={classes.statValue}>{userStats.inactiveUsers}</span>
        </div>
        <div className={classes.statCard}>
          <span className={classes.statLabel}>New Registrations</span>
          <span className={classes.statValue}>
            {userStats.newRegistrations}
          </span>
        </div>
      </div>

      <ContentModeration newUrl="http://localhost:3030/admin/allPendingReports" />
    </div>
  );
}
