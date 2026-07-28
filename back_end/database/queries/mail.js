const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, text, html }) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    text: text || "", // גיבוי לטקסט רגיל
    html: html || undefined, // במידה ונשלח עיצוב HTML
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully: " + info.response);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    // איננו רוצים שהכשל במייל יפיל את שאר השרת
    return { success: false, error };
  }
};

module.exports = { sendEmail };
