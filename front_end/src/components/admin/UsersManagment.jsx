import React, { useEffect, useState } from "react";
import axios from "axios";
import classes from "./usersmanagment.module.css";
import { useNavigate } from "react-router-dom";

export default function UsersManagment() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [userStats, setUserStatas] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newRegistrations: 0,
  });
  //Filter Users According to the searching role status
  const filteredUsers = users.filter((user) => {
    const fullName = `${user?.first_name} ${user?.last_name}`.toLowerCase();
    const email = (user?.email || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    const roleMatch =
      role === "" || user.role.toLowerCase() === role.toLowerCase();
    const statusMatch =
      Number(status) === -1 || user.is_active === Number(status);

    return (
      (fullName.includes(search) || email.includes(search)) &&
      roleMatch &&
      statusMatch
    );
  });

  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

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
    console.log(userStats);
  }, []);
  useEffect(() => {
    const fetchUsers = async () => {
      setUsers([]);
      try {
        const response = await axios.get(
          "http://localhost:3030/admin/allUsers",
          { withCredentials: true },
        );
        if (response.data.success) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, role, status]);

  const handleToggleActive = async (userId, userActive) => {
    const action = userActive ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this user?`,
    );

    if (!confirmed) return;
    const newStatus = userActive === 1 ? 0 : 1;
    try {
      const response = await axios.put(
        "http://localhost:3030/admin/deactivate",
        { userId, status: newStatus },
        { withCredentials: true },
      );

      if (response.data.success) {
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === userId ? { ...u, is_active: newStatus } : u,
          ),
        );
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Failed to update user status");
    }
  };
  return (
    <div className={classes.page}>
      <div className={classes.pageHeader}>
        <h1>Users Management</h1>
        <p>Monitor accounts, filter users, and manage access</p>
      </div>

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
          <span className={classes.statValue}>{userStats.newRegistrations}</span>
        </div>
      </div>

      <div className={classes.searchBarContainer}>
        <input
          type="text"
          placeholder="Search by name, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={classes.searchInput}
        />
        <div className={classes.filterSection}>
          <label>Filter by Role: </label>
          <select
            className={classes.filterSelect}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Chief">Chief</option>
            <option value="Hall_Owner">Hall Owner</option>
            <option value="Customer">Customer</option>
          </select>
        </div>

        <div className={classes.filterSection}>
          <label>Filter by Status: </label>
          <select
            className={classes.filterSelect}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="-1">All</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>

        <div>
          <button
            onClick={() => {
              setSearchTerm("");
              setRole("");
              setStatus(-1);
              setCurrentPage(1);
            }}
            className={classes.resetBtn}
          >
            Reset Filters
          </button>
        </div>

        <div>
          <button
            onClick={() => navigate("/admin/add-user")}
            className={classes.addUserBtn}
          >
            + Add New User
          </button>
        </div>
      </div>
      <div className={classes.resultsInfo}>
        Showing {currentUsers.length} of {filteredUsers.length} users
      </div>
      {loading ? (
        <div className={classes.loadingContainer}>
          <div className={classes.spinner}></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <div className={classes.tableWrapper}>
          <table className={classes.customtable}>
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr className={classes.emptyRow}>
                  <td colSpan="7">No users found</td>
                </tr>
              ) : (
                currentUsers.map((user) => (
                  <tr key={user?.id}>
                    <td>{user?.first_name}</td>
                    <td>{user?.last_name}</td>
                    <td>{user?.email}</td>
                    <td>
                      <span
                        className={`${classes.roleBadge} ${
                          classes[user.role.toLowerCase()]
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={
                          user?.is_active === 1
                            ? classes.statusActive
                            : classes.statusInactive
                        }
                      >
                        {user?.is_active === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          handleToggleActive(user?.id, user?.is_active)
                        }
                        className={
                          user?.is_active
                            ? classes.deactivateBtn
                            : classes.activateBtn
                        }
                      >
                        {user?.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className={classes.pagination}>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </button>
        <span className={classes.pageInfo}>Page {currentPage}</span>
        <button
          disabled={indexOfLastUser >= filteredUsers.length}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
