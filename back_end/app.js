const express = require("express");
const cors = require("cors");
const session = require("express-session");
const port = process.env.PORT || 3030;
// הפעלת מנגנון התזכורות האוטומטיות
require("./database/queries/cronScheduler");

const { sendEmail } = require("./database/queries/mail");

const { fetchAllLocalities } = require("./database/queries/cities");

const app = express();
// 1. מאפשר גישה ממקורות שונים (מונע שגיאות CORS כשנחבר את ה-React)
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
    credentials: true,
  }),
);
// 2. מפענח בקשות מסוג JSON והופך אותן לאובייקט בתוך req.body
app.use(express.json());
// 3. מפענח נתונים שנשלחים דרך טפסים סטנדרטיים (URL Encoded)
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  console.log(req.url + " 👀");
  next();
});
// הפיכת תיקיית uploads לציבורית כדי שנוכל לראות את התמונות בדפדפן
app.use("/uploads", express.static("uploads"));

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
    },
  }),
);

// --- Routes (נתיבים) ---
// הגדרת נתיב בסיס למשתמשים - כל מה שמתחיל ב-/user יעבור לקובץ userRoutes
const userRoutes = require("./routes/user");
const providerRoutes = require("./routes/provider");
const adminRoutes = require("./routes/admin");
const customerRoutes = require("./routes/customer");

app.use("/user", userRoutes);
app.use("/provider", providerRoutes);
app.use("/admin", adminRoutes);
app.use("/customer", customerRoutes);

app.get("/api/localities", async (req, res) => {
  try {
    const data = await fetchAllLocalities();
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Express Route Example
app.post("/api/send-notification", async (req, res) => {
  const { email, phone, message } = req.body;

  try {
    // שליחת מייל
    if (email) await sendEmail({to: email, subject: "הודעה חדשה מהאתר", text: message});

    // שליחת SMS

    res.status(200).json({ message: "ההודעות נשלחו בהצלחה!" });
  } catch (error) {
    res.status(500).json({ error: "שגיאה בשליחת ההודעות" });
  }
});

app.listen(port, () => {
  console.log(`The app is running in ${port}`);
});
