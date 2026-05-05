import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

// ייבוא ה-CSS
import styles from "./app.module.css";

// Components
import Navbar from "../components/Navbar";
import Register from "../components/registerOrlogin/Register";
import Login from "../components/registerOrlogin/Login";
import Account from "../components/BasicComponents/Account";
import Home from "../components/BasicComponents/Home";
import DetailsOFbusiness from "../components/provider/DetailsOFbusiness";
import SideBar from "../components/SideBar/sideBar";
import UsersManagment from "../components/admin/UsersManagment";
import ServicesApprovals from "../components/admin/ServicesApprovals";
import axios from "axios";
// import CitySelect from "../components/provider/CitySelect";
import FindAVendor from "../components/customer/findAvendors/FindAVendor";
import BookEvent from "../components/customer/BOOKEVENT/BookEvent";
import MyBooking from "../components/customer/MYEVENTS/MyBooking";



function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  console.log(" i AM IN APPPPPP🙌");
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
        console.log(user);
      } catch (error) {
        setUser(null);
        console.log("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [user != null]);

  // if (loading) {
  //   return <div className={styles.loader}>Loading...</div>;
  // }

  return (
    <Router>
      <div className={styles.appWrapper}>
        <Toaster position="top-center" reverseOrder={false} />
        <Navbar user={user} setUserTo={setUser} />

        {/* משתמשים בדיב עוטף שיהיה ה"קונטיינר" של ה-Flex */}

        <div className={styles.mainLayout}>
          {/* צד שמאל: סיידבר (יופיע רק אם יש יוזר) */}
          {user != null && (
            <aside className={styles.sidebarContainer}>
              <SideBar user={user} />
            </aside>
          )}

          {/* צד ימין: התוכן המשתנה של הדפים */}
          <main className={styles.contentArea}>
            {/* <CitySelect /> */}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/login"
                element={<Login onLoginSuccess={setUser} />}
              />
              <Route
                path="/register"
                element={<Register onLoginSuccess={setUser} />}
              />
              <Route
                path="/account"
                element={<Account user={user} onUpdateSuccess={setUser} />}
              />
              <Route
                path="/businessAccount"
                element={<DetailsOFbusiness user={user} />}
              />
              <Route path="/usersmanagment" element={<UsersManagment />} />
              <Route
                path="/servicesapprovals"
                element={<ServicesApprovals user={user} />}
              />
              <Route
                path="/findavendor"
                element={<FindAVendor user={user} />}
              />
              <Route path="/bookEvent" element={<BookEvent user={user} />} />
              <Route path="/myBooking" element={<MyBooking user={user} />} />

              <Route path="*" element={<h2>Page Not Found 404</h2>} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
export default App;
