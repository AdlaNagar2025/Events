import React from "react";
import API from "../../services/api";
import { useState, useEffect } from "react";
import CommentReportModal from "./CommentReportModal";
import classes from "./CommentsAndReviews.module.css";

export default function CommentsAndReviews({ role, user }) {
  const [selectedReviewForReport, setSelectedReviewForReport] = useState(null);
  const [reviewsList, setReviewsList] = useState([]);

  const fetchAllComments = async () => {
    try {
      let url = "/provider/allCommentsAndReviews";
      if (role === "Customer")
        url = `/customer/allCommentsAndReviews/${user?.id}`;
      if (role === "Admin") url = `/admin/allCommentsAndReviews/${user?.id}`;
      const response = await API.get(url);

      const rawReviews = response.data.data;

      const formattedReviews = rawReviews.map((item) => {
        const date = item.created_at ? item.created_at.slice(0, 10) : "";

        const clientName = item.last_name
          ? `${item.first_name} ${item.last_name.charAt(0)}.`
          : item.first_name;

        return {
          reviewId: item.review_id,
          rating: item.rating,
          comment: item.comment,
          date: date,
          clientName: clientName,
          userId: item.user_id,
        };
      });

      setReviewsList(formattedReviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  useEffect(() => {
    fetchAllComments();
  }, []);

  const canReport = role === "Chief" || role === "Hall_Owner";

  return (
    <div className={classes.wrap}>
      <h2>Clients & Reviews</h2>
      <div className={classes.tableWrap}>
        <table className={classes.table}>
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Date</th>
              <th>Rating</th>
              <th>Comments</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {reviewsList.length > 0 ? (
              reviewsList.map((review) => (
                <tr key={review.reviewId}>
                  <td>{review.clientName}</td>
                  <td>{review.date}</td>
                  <td>⭐ {review.rating} / 5</td>
                  <td>{review.comment}</td>
                  <td>
                    {canReport && (
                      <button
                        type="button"
                        onClick={() => setSelectedReviewForReport(review)}
                        className={classes.reportBtn}
                      >
                        Report
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className={classes.emptyCell}>
                  No reviews found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedReviewForReport && (
        <CommentReportModal
          review={selectedReviewForReport}
          onClose={() => setSelectedReviewForReport(null)}
        />
      )}
    </div>
  );
}
