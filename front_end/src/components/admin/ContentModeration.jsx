import React, { useEffect, useState } from "react";
import API from "../../services/api";
import classes from "./servicesapprovals.module.css";
import toast from "react-hot-toast";

export default function ContentModeration({ newUrl }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const fetchAllReports = async () => {
      try {
        let url = newUrl ? newUrl : "/admin/allReports";
        const response = await API.get(url);
        if (response.data.success) {
          setReports(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    };

    fetchAllReports();
  }, [newUrl]);

  // ✨ הפונקציה המעודכנת שמחברת את הכל לבקאנד
  const handleUpdateStatus = async (report, newStatus) => {
    try {
      const response = await API.post(
        "/admin/resolveReport",
        {
          reportId: report.id,
          newStatus: newStatus,
          targetType: report.target_type,
          targetId: report.target_id, // ה-ID של התגובה/אלמנט
          offenderId: report.offender_id, // ה-ID של המשתמש הפוגע (וודאי שזה השם מה-SQL שלך)
          reason: report.reason,
        }      );

      if (response.data.success) {
        toast.success(response.data.message || "Status updated successfully!");

        // עדכון הסטייט המקומי כדי שהטבלה תתעדכן מיידית לעיני האדמין
        setReports((prevReports) =>
          prevReports.map((r) =>
            r.id === report.id ? { ...r, status: newStatus } : r,
          ),
        );
      }
    } catch (error) {
      console.error("Error updating report status:", error);
      toast.error(error.response?.data?.devError || "Failed to update report status");
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

                  {/* סוג התלונה */}
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
                              handleUpdateStatus(report, "RESOLVED")
                            } // ✨ מעביר את כל ה-object
                          >
                            Resolve
                          </button>
                          <button
                            className={classes.denyBtn}
                            onClick={() =>
                              handleUpdateStatus(report, "DISMISSED")
                            } // ✨ מעביר את כל ה-object
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
