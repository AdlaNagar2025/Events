// import { useState } from "react";
// import axios from "axios";

// function NotificationForm() {
//   const [email, setEmail] = useState("");
//   const [phone, setPhone] = useState("");
//   const [message, setMessage] = useState("");

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const response = await axios.post(
//         "http://localhost:3030/api/send-notification",
//         {
//           email,
//           phone,
//           message,
//         },
//       );
//       alert(response.data.message);
//     } catch (error) {
//       alert("נכשל בשליחה");
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <input
//         type="email"
//         placeholder="אימייל"
//         onChange={(e) => setEmail(e.target.value)}
//       />
//       <input
//         type="tel"
//         placeholder="טלפון (למשל 97250...)"
//         onChange={(e) => setPhone(e.target.value)}
//       />
//       <textarea
//         placeholder="תוכן ההודעה"
//         onChange={(e) => setMessage(e.target.value)}
//       />
//       <button type="submit">שלח הודעות</button>
//     </form>
//   );
// }
