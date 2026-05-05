import Navbar from "../NavBar/Navbar";
import classes from "./home.module.css";
// import home_background from "../assets/home_background.png";
// import backGround from "../assets/BackGround.png";
import { useNavigate } from "react-router-dom";


export default function Home() {
  const navigate=useNavigate()
  function handleClick(){
    navigate("/login")
  }
  return (
    <section>
      <main className={classes.main}>
        <h1>
          Welcome to EventHub: One solution for planning your perfect event
        </h1>

        <div className={classes.mdiv}>
          Discover, manage and connect with event professionals in one place.
          The online platform linking clients to professional suppliers.
        </div>

        <div className={classes.start} onClick={handleClick}>
          START PLANNING YOUR EVENT
        </div>

        <div className={classes.container}>
          <p>Who Is It For?</p>
          <div className={classes.mid}>
            <div className={classes.infoCard}>
              <p>FOR CLIENTS</p>
              <p>Search suppliers</p>
              <p>Manage time</p>
            </div>

            <div className={classes.infoCard}>
              <p>FOR SUPPLIERS</p>
              <p>Grow business</p>
              <p>Showcase work</p>
            </div>

            <div className={classes.infoCard}>
              <p>FOR ADMIN</p>
              <p>Oversee content</p>
              <p>Manage system</p>
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}