import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import styles from "../app/app.module.css";
import Navbar from "../components/common/Navbar";
import SideBar from "../components/common/sideBar";

export default function MainLayout({ user, setUser }) {
  return (
    <div className={styles.appWrapper}>
      <Toaster position="top-center" reverseOrder={false} />
      <Navbar user={user} setUserTo={setUser} />

      <div className={styles.mainLayout}>
        {user != null && (
          <aside className={styles.sidebarContainer}>
            <SideBar user={user} />
          </aside>
        )}

        <main className={styles.contentArea}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
