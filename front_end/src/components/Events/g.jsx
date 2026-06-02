// בקוד הנוכחי שלך, המבנה הכללי מצוין! יצרת זרימה של 3 שלבים (פרטים, תמונות, ויומן) ובסוף כפתור שליחה לאדמין.

// עם זאת, יש **מספר באגים קריטיים ובעיות לוגיות** ברכיב `DetailsOFbusiness` שמונעים מהתהליך לעבוד בצורה תקינה. הנה רשימת הבעיות שמצאתי ואיך נתקן אותן כדי שהזרימה תעבוד בדיוק כמו שאתה רוצה.

// ---

// ## 🔍 הבעיות המרכזיות שמצאתי בקוד שלך:

// 1. **שימוש במשתנה לא קיים (`status`):** בתוך ה-`useEffect` כתבת `if (status === "PENDING")`. המשתנה `status` לא מוגדר שם, היית צריך להשתמש ב-`response.data.status`.
// 2. **סינטקס שבור בהצגת הדירוג (רכיב הסטאר):**
// כתבת `{currentRating > 0 ? currentRating > 0 \`⭐` :""}`. זה סינטקס לא חוקי ב-JavaScript שגורם לקריסת הרכיב.
// 3. **בדיקת מילוי שלב 1 (פרטי העסק):**
// כרגע, בעל העסק יכול ללחוץ על "Submit To Admin" גם אם הוא לא מילא את שלב 1 (הטופס של `BusinessAccount`) אלא רק העלה תמונה. אנחנו צריכים לוודא שהוא אכן שמר את הפרטים לפני שהוא שולח לאדמין.

// ---

// ## 🛠️ הקוד המתוקן והמשופר (`DetailsOFbusiness.jsx`)

// הנה הקוד המתוקן. שים לב שהוספתי משתנה סטייט חדש בשם `isProfileSaved` כדי לוודא שבעל העסק באמת שמר את הפרטים שלו לפחות פעם אחת לפני השליחה לאדמין.

// ```jsx
// import React, { useState, useEffect } from "react";
// import BusinessAccount from "../BasicToProviderProfile/BusinessAccount";
// import ImageUpload from "../BasicToProviderProfile/ImagesCode/ImageUpload";
// import Calendar from "../BasicToProviderProfile/Calendar/Calendar";
// import classes from "./DetailsOFbusiness.module.css";
// import { FaTimes } from "react-icons/fa";
// import axios from "axios";

// function DetailsOFbusiness({ user }) {
//   const [isDisable, setIsDisable] = useState(false);
//   const [currentStatus, setCurrentStatus] = useState("");
//   const [currentRating, setCurrentRating] = useState(0);
//   const [isProfileSaved, setIsProfileSaved] = useState(false); // סטייט חדש לבדיקה אם שלב 1 בוצע
//   const [check, setCheck] = useState(false); // בדיקת העלאת תמונות (שלב 2)
//   const [error, setError] = useState("");

//   const getStatus = async () => {
//     try {
//       const response = await axios.get(
//         "http://localhost:3030/provider/MyBusinessStatusAndRating",
//         { withCredentials: true },
//       );
//       if (response.data.success) {
//         console.log("Data", response.data);
//         const status = response.data.status;
//         setCurrentStatus(status);
//         setCurrentRating(response.data.avgRating || 0);
        
//         // תיקון באג: שימוש בסטטוס מתוך ה-response
//         if (status === "PENDING" || status === "APPROVED") {
//           setIsDisable(true);
//         }

//         // אם חזרו נתונים של העסק, נסמן ששלב 1 כבר מולא בעבר
//         if (response.data.hasProfile) {
//           setIsProfileSaved(true);
//         }
//       }
//     } catch (error) {
//       console.error("Failed to fetch status:", error);
//     }
//   };

//   useEffect(() => {
//     if (user?.id) {
//       getStatus();
//     }
//   }, [user?.id]);

//   async function handleStatusChange() {
//     try {
//       // 1. הגנה: בדיקה ששלב 1 בוצע (מילוי הטופס)
//       if (!isProfileSaved) {
//         setError("You must save your business details (Step 1) before submitting.");
//         return;
//       }

//       // 2. הגנה: בדיקה ששלב 2 בוצע (העלאת תמונות)
//       if (!check) {
//         setError("You must upload at least one image (Step 2) before submitting.");
//         return;
//       }

//       setError("");
//       const tableName = user?.role === "Chief" ? "chiefs" : "halls";
//       const id = user?.id;
//       const newStatus = "PENDING";
      
//       const response = await axios.post(
//         "http://localhost:3030/provider/approve-business",
//         { type: tableName, id, newStatus },
//         { withCredentials: true },
//       );

//       alert(response.data.message || "Submitted successfully for review!");
//       setIsDisable(true);
//       setCurrentStatus("PENDING");
//     } catch (error) {
//       console.error("Error updating status:", error);
//       setError("Failed to submit profile. Try again later.");
//     }
//   }

//   return (
//     <div className={`${classes.mainContainer} ${isDisable ? classes.disabledArea : ""}`}>
//       <header className={classes.header}>
//         <h1>Business Setup</h1>
//         <p>
//           Status: <strong className={classes[currentStatus] || ""}>{currentStatus || "NOT SUBMITTED"}</strong>
//         </p>
//         {/* תיקון סינטקס הדירוג */}
//         {currentRating > 0 && (
//           <p className={classes.ratingDisplay}>
//             Rating: {currentRating} ⭐
//           </p>
//         )}
//       </header>

//       {/* שלב 1: פרטי העסק */}
//       <section className={classes.stepCard}>
//         <div className={classes.stepNumber}>1</div>
//         {/* פונקציית getStatus מועברת כדי לעדכן את הסטייט ברגע ששומרים את הטופס */}
//         <BusinessAccount 
//           user={user} 
//           isDisable={isDisable} 
//           onSaveSuccess={() => setIsProfileSaved(true)} 
//         />
//       </section>

//       <div className={classes.divider} />

//       {/* שלב 2: תמונות */}
//       <section className={classes.stepCard}>
//         <div className={classes.stepNumber}>2</div>
//         <ImageUpload
//           role={user?.role}
//           provider={user}
//           ok={setCheck}
//           isDisable={isDisable}
//         />
//       </section>

//       <div className={classes.divider} />
      
//       {/* שלב 3: יומן */}
//       <section className={classes.stepCard}>
//         <div className={classes.stepNumber}>3</div>
//         <Calendar role={user?.role} user={user} isDisable={isDisable} />
//       </section>

//       {/* כפתור שליחה סופי לאדמין */}
//       <button
//         onClick={handleStatusChange}
//         disabled={isDisable}
//         className={classes.submitBtn}
//       >
//         {isDisable 
//           ? currentStatus === "PENDING" 
//             ? "Waiting for Admin Approval..." 
//             : "Profile Approved!" 
//           : "Submit To Admin"}
//       </button>

//       {error && (
//         <div className={classes.errorMessage}>
//           <span>{error}</span>
//           <button onClick={() => setError("")} className={classes.closeError}>
//             <FaTimes />
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// export default DetailsOFbusiness;

// ```

// ---

// ## 🔗 מה אתה צריך לעדכן ברכיב הבן `BusinessAccount`?

// כדי שהרכיב האבא (`DetailsOFbusiness`) ידע שבעל העסק אכן שמר בהצלחה את הטופס, אנחנו צריכים לקרוא לפונקציה `onSaveSuccess` מתוך `BusinessAccount` ברגע שהשמירה מצליחה.

// פתח את הקובץ של `BusinessAccount` ובצע את הפיקס הקטן הזה:

// 1. קבל את ה-prop החדש בהגדרת הפונקציה:

// ```javascript
// export default function BusinessAccount({ user, isDisable, onSaveSuccess }) { // <-- הוסף את ה-prop כאן

// ```

// 2. בתוך פונקציית הצירוף `submitProfile`, מיד אחרי שהתראה של ההצלחה קופצת, תקרא לפונקציה הזו:

// ```javascript
// if (response.data.success) {
//   toast.success(response.data.message || "Saved successfully! ✨", {
//     id: loadingId,
//   });
//   fetchProfile();
//   if (onSaveSuccess) onSaveSuccess(); // <-- הוסף את השורה הזו כאן!
// }

// ```

// ## 💡 טיפ חשוב לצד השרת (Backend)

// בנתיב `http://localhost:3030/provider/MyBusinessStatusAndRating`, בנוסף ל-`status` ו-`avgRating`, מומלץ להחזיר משתנה בוליאני בשם `hasProfile`.

// השרת פשוט יבדוק: אם קיימת שורה בטבלת ה-`chiefs` או `halls` עבור ה-`id` הזה, הוא יחזיר `hasProfile: true`, אחרת `false`. זה יבטיח שגם אם המשתמש ירענן את הדף, המערכת תדע שהוא כבר מילא את שלב 1.