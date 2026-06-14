import React, { useEffect, useState } from "react";
import axios from "axios";
import classes from "./servicesapprovals.module.css"; // משתמשים באותו קובץ עיצוב של הטבלאות שלך

export default function ContentModeration() {
  const [reports, setReports] = useState([]); // תוקן ל-[] מתוך useState

  useEffect(() => {
    const fetchAllReports = async () => {
      try {
        // הכתובת המדויקת של הראוט החדש שיצרנו ב-Backend
        const response = await axios.get(
          "http://localhost:3030/admin/allReports",
          { withCredentials: true },
        );
        if (response.data.success) {
          setReports(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    };

    fetchAllReports();
  }, []);

  // פונקציה לעדכון הסטטוס של הדיווח (אישור/ביטול)
  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      const response = await axios.put(
        "http://localhost:3030/admin/updateReport",
        { reportId, newStatus },
        { withCredentials: true },
      );

      if (response.data.success) {
        setReports((prevReports) =>
          prevReports.map((report) =>
            report.id === reportId ? { ...report, status: newStatus } : report,
          ),
        );
      }
    } catch (error) {
      console.error("Error updating report status:", error);
      alert("Failed to update report status");
    }
  };

  return (
    <div className={classes.container}>
      <h2>Content Moderation & Complaints</h2>

      {reports.length !== 0 ? (
        <div className={classes.tableContainer}>
          <table className={classes.customtable}>
            <thead>
              <tr>
                <th>Reporter Name</th>
                <th>Reported Target</th>
                <th>Type</th>
                <th>Reason & Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  {/* מי שהתלונן */}
                  <td>
                    <div style={{ fontWeight: "bold" }}>
                      {report.reporter_name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#7f8c8d" }}>
                      {report.reporter_email}
                    </div>
                  </td>

                  {/* על מי התלוננו */}
                  <td>
                    <div style={{ fontWeight: "bold", color: "#c0392b" }}>
                      {report.reported_name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#7f8c8d" }}>
                      {report.reported_email}
                    </div>
                  </td>

                  {/* סוג התלונה: יוזר, עסק או קומנט */}
                  <td>
                    <span
                      style={{
                        backgroundColor: "#e2e8f0",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}
                    >
                      {report.target_type}
                    </span>
                  </td>

                  {/* סיבה ופירוט */}
                  <td>
                    <div style={{ fontWeight: "600" }}>{report.reason}</div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#555",
                        marginTop: "3px",
                        maxWidth: "250px",
                      }}
                    >
                      {report.description || "No description provided."}
                    </div>
                  </td>

                  {/* סטטוס הטיפול */}
                  <td>
                    <span
                      style={{
                        color:
                          report.status === "PENDING"
                            ? "#f39c12"
                            : report.status === "RESOLVED"
                              ? "#27ae60"
                              : "#7f8c8d",
                        fontWeight: "bold",
                      }}
                    >
                      {report.status}
                    </span>
                  </td>

                  {/* כפתורי פעולה לאדמין */}
                  <td>
                    <div className={classes.actionBtns}>
                      {report.status === "PENDING" && (
                        <>
                          <button
                            className={classes.approveBtn}
                            onClick={() =>
                              handleUpdateStatus(report.id, "RESOLVED")
                            }
                          >
                            Resolve
                          </button>
                          <button
                            className={classes.denyBtn}
                            onClick={() =>
                              handleUpdateStatus(report.id, "DISMISSED")
                            }
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                      {report.status !== "PENDING" && (
                        <span style={{ color: "#95a5a6", fontSize: "13px" }}>
                          Processed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ textAlign: "center", color: "#777", marginTop: "20px" }}>
          No reports found. Everything is clean! ✨
        </p>
      )}
    </div>
  );
}
