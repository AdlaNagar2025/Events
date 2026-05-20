// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const client = require("twilio")(accountSid, authToken);

// const sendSMS = async (to, message) => {
//   try {
//     const response = await client.messages.create({
//       body: message,
//       from: "+1234567890", // המספר הוירטואלי שקיבלת מטוויליו
//       to: to, // מספר היעד (למשל: +972501234567)
//     });
//     console.log("SMS sent:", response.sid);
//     return { success: true };
//   } catch (error) {
//     console.error("Error sending SMS:", error);
//     throw error;
//   }
// };

// module.exports = { sendSMS };