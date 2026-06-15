import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import axios from "axios";

import AuthLayout from "../layouts/AuthLayout";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "../layouts/ProtectedRoute";
import GuestRoute from "../layouts/GuestRoute";
import RequireApproved from "../layouts/RequireApproved";

import Register from "../components/registerOrlogin/Register";
import Login from "../components/registerOrlogin/Login";
import Account from "../components/BasicComponents/Account";
import Home from "../components/BasicComponents/Home";
import NotFound from "../components/BasicComponents/NotFound";
import DetailsOFbusiness from "../components/provider/DetailsOFbusiness";
import UsersManagment from "../components/admin/UsersManagment";
import ServicesApprovals from "../components/admin/ServicesApprovals";
import FindAVendor from "../components/customer/findAvendors/FindAVendor";
import BookEvent from "../components/customer/BOOKEVENT/BookEvent";
import MyBooking from "../components/customer/MYEVENTS/MyBooking";
import MyEventsACalender from "../components/Events/MyEventsACalender";
import FavoriteProviders from "../components/customer/FavoriteProviders";
import Notification from "../components/Notifications/Notification";
import CommentsAndReviews from "../components/provider/CommentsAndReviews";
import Dashboard from "../components/provider/Dashboard";
import AddUser from "../components/admin/AddUser";
import ContentModeration from "../components/admin/contentModeration";
import ReportSection from "../components/Events/ReportSection";
import AdminDashboard from "../components/admin/AdminDashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3030/user/checkSession",
          { withCredentials: true },
        );
        if (response.data.success) {
          setUser(response.data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
        console.log("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthLayout />}>
          <Route element={<GuestRoute user={user} loading={loading} />}>
            <Route path="login" element={<Login onLoginSuccess={setUser} />} />
            <Route
              path="register"
              element={<Register onLoginSuccess={setUser} />}
            />
          </Route>
        </Route>

        <Route element={<MainLayout user={user} setUser={setUser} />}>
          <Route path="/" element={<Home />} />

          <Route element={<ProtectedRoute user={user} loading={loading} />}>
            <Route
              path="/account"
              element={<Account user={user} onUpdateSuccess={setUser} />}
            />
            <Route
              path="/notifications"
              element={<Notification user={user} />}
            />
          </Route>

          <Route
            path="/customer"
            element={
              <ProtectedRoute
                user={user}
                loading={loading}
                allowedRoles={["Customer"]}
              />
            }
          >
            <Route path="find-vendor" element={<FindAVendor user={user} />} />
            <Route path="book-event" element={<BookEvent user={user} />} />
            <Route path="my-booking" element={<MyBooking user={user} />} />
            <Route
              path="favorites"
              element={<FavoriteProviders user={user} />}
            />
            <Route
              path="reports"
              element={<ReportSection role={user?.role} user={user?.id} />}
            />
          </Route>

          <Route
            path="/admin"
            element={
              <ProtectedRoute
                user={user}
                loading={loading}
                allowedRoles={["Admin"]}
              />
            }
          >
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<UsersManagment />} />
            <Route
              path="services-approvals"
              element={<ServicesApprovals user={user} />}
            />
            <Route path="add-user" element={<AddUser />} />
            <Route path="dashboard" element={<AdminDashboard user={user} />} />
            <Route path="content-moderation" element={<ContentModeration />} />
          </Route>

          <Route
            path="/provider"
            element={
              <ProtectedRoute
                user={user}
                loading={loading}
                allowedRoles={["Chief", "Hall_Owner"]}
              />
            }
          >
            <Route
              path="business"
              element={<DetailsOFbusiness user={user} />}
            />
            <Route element={<RequireApproved user={user} />}>
              <Route path="dashboard" element={<Dashboard user={user} />} />
              <Route
                path="calendar"
                element={<MyEventsACalender user={user} />}
              />
              <Route
                path="reviews"
                element={
                  <CommentsAndReviews role={user?.role} user={user?.id} />
                }
              />
              <Route
                path="reports"
                element={<ReportSection role={user?.role} user={user?.id} />}
              />
            </Route>
          </Route>
        </Route>

        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/not-found" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
