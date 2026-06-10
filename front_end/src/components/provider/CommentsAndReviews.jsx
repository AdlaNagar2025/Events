import React from "react";
import axios from "axios";
import { useState, useEffect } from "react";

export default function CommentsAndReviews({ role, user }) {
  const [data, setData] = useState([
    { reviews: "", comments: "", Date: "", ClientName: "" },
  ]);
  const [reviewsList, setReviewsList] = useState([]);

  const fetchAllComments = async () => {
    try {
      let url = "http://localhost:3030/provider/allCommentsAndReviews";
      if (role === "Customer")
        url = `http://localhost:3030/customer/allCommentsAndReviews/${user?.id}`;
      if (role === "Admin")
        url = `http://localhost:3030/admin/allCommentsAndReviews/${user?.id}`;
      const response = await axios.get(url, { withCredentials: true });

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

  return (
    <div>
      <h2>Clients & Reviews</h2>
      <table>
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Date</th>
            <th>Rating</th>
            <th>Comments</th>
          </tr>
        </thead>
        <tbody>
          {/* 4. רצים בלולאה על המערך מה-State ומרנדרים שורה לכל ביקורת */}
          {reviewsList.length > 0 ? (
            reviewsList.map((review) => (
              <tr key={review.reviewId}>
                <td>{review.clientName}</td>
                <td>{review.date}</td>
                <td>⭐ {review.rating} / 5</td>
                <td>{review.comment}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: "center" }}>
                No reviews found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
