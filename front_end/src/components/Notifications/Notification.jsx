import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import classes from "./notification.module.css";

function formatSentAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUnread(isRead) {
  return Number(isRead) === 0;
}

/** Returns a deep-link action for known notification messages, by role. */
function getNotificationAction(message = "", role) {
  const text = String(message);

  if (role === "Admin") {
    if (/pending approval|services approvals/i.test(text)) {
      return {
        to: "/admin/services-approvals",
        label: "Open Services Approvals →",
      };
    }
    return null;
  }

  if (role === "Chief" || role === "Hall_Owner") {
    if (
      /new booking request|assigned to a new event|re-approve your availability|CANCELLED by the customer/i.test(
        text,
      )
    ) {
      return { to: "/provider/dashboard", label: "Open Dashboard →" };
    }
    if (/business profile has been approved/i.test(text)) {
      return { to: "/provider/dashboard", label: "Open Dashboard →" };
    }
    if (/business profile was rejected/i.test(text)) {
      return { to: "/provider/business", label: "Open Business Profile →" };
    }
    return null;
  }

  if (role === "Customer") {
    if (/booking|DECLINED|CANCEL|APPROVED|event/i.test(text)) {
      return { to: "/customer/my-booking", label: "Open My Bookings →" };
    }
    return null;
  }

  return null;
}

export default function Notification({ user }) {
  const [messages, setMessages] = useState([]);

  const getRoleEndpoint = () => {
    const currentRole = user?.role;
    if (currentRole === "Chief" || currentRole === "Hall_Owner") {
      return "provider";
    }
    return currentRole ? currentRole.toLowerCase() : "";
  };

  const endpointRole = getRoleEndpoint();

  const fetchAllNotifications = async () => {
    if (!endpointRole) return;

    try {
      const response = await API.get(`/${endpointRole}/MyNotifications`);
      setMessages(response.data.data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setMessages([]);
    }
  };

  const handleChangeNotification = async (notificationId, isRead) => {
    if (!endpointRole || !isUnread(isRead)) return;

    try {
      await API.put(
        `/${endpointRole}/updateNotification/${notificationId}`,
        {},
      );
      setMessages((prev) =>
        prev.map((msg) =>
          msg.notification_id === notificationId
            ? { ...msg, isRead: 1 }
            : msg,
        ),
      );
    } catch (error) {
      console.error("Error updating notification:", error);
    }
  };

  useEffect(() => {
    fetchAllNotifications();
  }, [user]);

  return (
    <div className={classes.page}>
      <header className={classes.pageHeader}>
        <h1>Notifications</h1>
        <p>Stay updated on bookings, approvals, and account activity.</p>
      </header>

      {messages.length === 0 ? (
        <div className={classes.empty}>No notifications yet.</div>
      ) : (
        <div className={classes.list}>
          {messages.map((msg) => {
            const unread = isUnread(msg.isRead);
            const action = getNotificationAction(msg.message, user?.role);

            return (
              <article
                key={msg.notification_id}
                className={`${classes.card} ${unread ? classes.unread : classes.read}`}
                onMouseEnter={() =>
                  handleChangeNotification(msg.notification_id, msg.isRead)
                }
              >
                <span className={classes.dot} aria-hidden="true" />
                <div className={classes.body}>
                  <p className={classes.message}>{msg.message}</p>
                  <div className={classes.meta}>
                    {msg.sent_at && (
                      <span className={classes.time}>
                        {formatSentAt(msg.sent_at)}
                      </span>
                    )}
                    <span
                      className={`${classes.badge} ${
                        unread ? classes.badgeUnread : classes.badgeRead
                      }`}
                    >
                      {unread ? "Unread" : "Read"}
                    </span>
                  </div>
                  {action && (
                    <Link
                      to={action.to}
                      className={classes.link}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChangeNotification(
                          msg.notification_id,
                          msg.isRead,
                        );
                      }}
                    >
                      {action.label}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
