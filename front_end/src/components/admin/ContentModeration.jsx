import React, { useEffect, useState } from "react";
import API from "../../services/api";
import classes from "./servicesapprovals.module.css";
import AppDialog from "../shared/AppDialog";
import AppModal from "../shared/AppModal";
import toast from "react-hot-toast";

function getStatusClass(status, classes) {
  if (status === "PENDING") return classes.statusPending;
  if (status === "RESOLVED") return classes.statusApproved;
  return classes.statusDeny;
}

export default function ContentModeration({ newUrl }) {
  const [reports, setReports] = useState([]);
  const [detailReport, setDetailReport] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { report, newStatus }

  useEffect(() => {
    const fetchAllReports = async () => {
      try {
        const url = newUrl ? newUrl : "/admin/allReports";
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

  const handleUpdateStatus = async (report, newStatus) => {
    try {
      const response = await API.post("/admin/resolveReport", {
        reportId: report.id,
        newStatus,
        targetType: report.target_type,
        targetId: report.target_id,
        offenderId: report.offender_id,
        reason: report.reason,
      });

      if (response.data.success) {
        toast.success(response.data.message || "Status updated successfully!");
        setReports((prevReports) =>
          prevReports.map((r) =>
            r.id === report.id ? { ...r, status: newStatus } : r,
          ),
        );
        setConfirmAction(null);
        setDetailReport(null);
      }
    } catch (error) {
      console.error("Error updating report status:", error);
      toast.error(
        error.response?.data?.devError || "Failed to update report status",
      );
    }
  };

  return (
    <div className={classes.page}>
      <div className={classes.pageHeader}>
        <h2>Content Moderation</h2>
        <p>Review complaints and resolve or dismiss reports</p>
      </div>

      {reports.length !== 0 ? (
        <div className={classes.tableContainer}>
          <table className={classes.customtable}>
            <thead>
              <tr>
                <th>Reporter</th>
                <th>Reported</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <div className={classes.providerCell}>
                      <strong>{report.reporter_name}</strong>
                      <span className={classes.subText}>
                        {report.reporter_email}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={classes.providerCell}>
                      <strong className={classes.reportedName}>
                        {report.reported_name}
                      </strong>
                      <span className={classes.subText}>
                        {report.reported_email}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={classes.typeChip}>{report.target_type}</span>
                  </td>
                  <td>
                    <div className={classes.reasonPreview}>
                      <strong>{report.reason}</strong>
                      <span className={classes.subText}>
                        {report.description
                          ? report.description.length > 60
                            ? `${report.description.slice(0, 60)}…`
                            : report.description
                          : "No description"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${classes.statusBadge} ${getStatusClass(report.status, classes)}`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td>
                    <div className={classes.actionBtns}>
                      <button
                        className={classes.showBtn}
                        onClick={() => setDetailReport(report)}
                      >
                        Details
                      </button>
                      {report.status === "PENDING" && (
                        <>
                          <button
                            className={classes.approveBtn}
                            onClick={() =>
                              setConfirmAction({
                                report,
                                newStatus: "RESOLVED",
                              })
                            }
                          >
                            Resolve
                          </button>
                          <button
                            className={classes.denyBtn}
                            onClick={() =>
                              setConfirmAction({
                                report,
                                newStatus: "DISMISSED",
                              })
                            }
                          >
                            Dismiss
                          </button>
                        </>
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
          <p>No reports found. Everything is clean.</p>
        </div>
      )}

      <AppModal
        open={!!detailReport}
        title="Report details"
        subtitle={detailReport ? `Status: ${detailReport.status}` : ""}
        size="md"
        onClose={() => setDetailReport(null)}
      >
        {detailReport && (
          <div className={classes.detailGrid}>
            <div>
              <span className={classes.detailLabel}>Reporter</span>
              <p>
                {detailReport.reporter_name}
                <br />
                <span className={classes.subText}>
                  {detailReport.reporter_email}
                </span>
              </p>
            </div>
            <div>
              <span className={classes.detailLabel}>Reported</span>
              <p className={classes.reportedName}>
                {detailReport.reported_name}
                <br />
                <span className={classes.subText}>
                  {detailReport.reported_email}
                </span>
              </p>
            </div>
            <div>
              <span className={classes.detailLabel}>Type</span>
              <p>
                <span className={classes.typeChip}>
                  {detailReport.target_type}
                </span>
              </p>
            </div>
            <div>
              <span className={classes.detailLabel}>Reason</span>
              <p>{detailReport.reason}</p>
            </div>
            <div className={classes.detailFull}>
              <span className={classes.detailLabel}>Description</span>
              <p>{detailReport.description || "No description provided."}</p>
            </div>
            {detailReport.status === "PENDING" && (
              <div className={`${classes.actionBtns} ${classes.detailFull}`}>
                <button
                  className={classes.approveBtn}
                  onClick={() =>
                    setConfirmAction({
                      report: detailReport,
                      newStatus: "RESOLVED",
                    })
                  }
                >
                  Resolve
                </button>
                <button
                  className={classes.denyBtn}
                  onClick={() =>
                    setConfirmAction({
                      report: detailReport,
                      newStatus: "DISMISSED",
                    })
                  }
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}
      </AppModal>

      <AppDialog
        open={!!confirmAction}
        title={
          confirmAction?.newStatus === "RESOLVED"
            ? "Resolve report"
            : "Dismiss report"
        }
        message={
          confirmAction?.newStatus === "RESOLVED"
            ? "Mark this report as resolved?"
            : "Dismiss this report without further action?"
        }
        confirmLabel={
          confirmAction?.newStatus === "RESOLVED" ? "Resolve" : "Dismiss"
        }
        danger={confirmAction?.newStatus === "DISMISSED"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() =>
          handleUpdateStatus(confirmAction.report, confirmAction.newStatus)
        }
      />
    </div>
  );
}
