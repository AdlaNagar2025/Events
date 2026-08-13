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

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export default function ContentModeration({ newUrl }) {
  const [reports, setReports] = useState([]);
  const [detailReport, setDetailReport] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchName, setSearchName] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Client-side filters: keep full list in `reports`, show only matches.
  const filteredReports = reports.filter((report) => {
    const matchStatus = !statusFilter || report.status === statusFilter;

    const name =
      `${report.reporter_name || ""} ${report.reported_name || ""}`.toLowerCase();
    const matchName =
      !searchName.trim() ||
      name.includes(searchName.trim().toLowerCase());

    const reportDay = report.created_at
      ? String(report.created_at).slice(0, 10)
      : "";
    const matchDate = !dateFilter || reportDay === dateFilter;

    return matchStatus && matchName && matchDate;
  });

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

  useEffect(() => {
    fetchAllReports();
  }, [newUrl]);

  const handleUpdateStatus = async (report, newStatus) => {
    try {
      const response = await API.post("/admin/resolveReport", {
        reportId: report.id,
        newStatus,
        targetType: report.target_type,
        targetId: report.target_id,
        offenderId: report.reported_id,
        reason: report.reason,
      });

      if (response.data.success) {
        toast.success(response.data.message || "Status updated successfully!");
        await fetchAllReports();
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

  const resetFilters = () => {
    setStatusFilter("");
    setSearchName("");
    setDateFilter("");
  };

  return (
    <div className={classes.page}>
      <div className={classes.pageHeader}>
        <h2>Content Moderation</h2>
        <p>Review complaints and resolve or dismiss reports</p>
      </div>

      <div className={classes.toolbar}>
        <div className={classes.searchGroup}>
          <label>Search by name</label>
          <input
            type="text"
            className={classes.searchInput}
            placeholder="Reporter or reported name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>

        <div className={classes.filterGroup}>
          <label>Status</label>
          <select
            className={classes.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>

        <div className={classes.filterGroup}>
          <label>Date</label>
          <input
            type="date"
            className={classes.searchInput}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <button type="button" className={classes.showBtn} onClick={resetFilters}>
          Reset filters
        </button>
      </div>

      {reports.length === 0 ? (
        <div className={classes.emptyState}>
          <p>No reports found. Everything is clean.</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className={classes.emptyState}>
          <p>No reports match your filters.</p>
        </div>
      ) : (
        <div className={classes.tableContainer}>
          <table className={classes.customtable}>
            <thead>
              <tr>
                <th>Reporter</th>
                <th>Reported</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <strong>{report.reporter_name}</strong>
                  </td>
                  <td>
                    <strong className={classes.reportedName}>
                      {report.reported_name}
                    </strong>
                  </td>
                  <td>
                    <span className={classes.typeChip}>{report.target_type}</span>
                  </td>
                  <td>
                    <strong>{report.reason}</strong>
                  </td>
                  <td>
                    <span
                      className={`${classes.statusBadge} ${getStatusClass(report.status, classes)}`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td>
                    <span className={classes.subText}>
                      {formatDate(report.created_at)}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <span className={classes.detailLabel}>Date</span>
              <p>{formatDateTime(detailReport.created_at)}</p>
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
            {detailReport.status === "DISMISSED" && (
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
