const getProfile=require("../database/queries/adminFunc")
/**
 * Middleware שבודק אם המשתמש מחובר.
 * אם אין User ב-Session, מחזיר 401 (Unauthorized).
 */
function isConnected(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res
    .status(401)
    .json({ success: false, message: "Please log in first" });
}

/**
 * Middleware שבודק אם המשתמש הוא ספק (Chief או Hall_Owner).
 * מניח שהמשתמש כבר עבר בדיקת isConnected.
 */
function isProvider(req, res, next) {
  // הגנה למקרה ששכחו להשתמש ב-isConnected לפני
  if (!req.session?.user) {
    return res
      .status(401)
      .json({ success: false, message: "Not authenticated" });
  }

  const role = req.session.user.role;
  if (role === "Chief" || role === "Hall_Owner") {
    return next();
  }
  return res
    .status(403)
    .json({ success: false, message: "Access denied: Providers only" });
}

/**
 * Middleware שבודק אם המשתמש הוא מנהל (Admin).
 */
function isAdmin(req, res, next) {
  if (req.session?.user?.role === "Admin") {
    return next();
  }
  return res
    .status(403)
    .json({ success: false, message: "Access denied: Admin only" });
}

/**
 * Middleware שבודק אם המשתמש הוא משתמש (Customer).
 */
function isCustomer(req, res, next) {
  if (req.session?.user?.role === "Customer") {
    return next();
  }
  return res
    .status(403)
    .json({ success: false, message: "Access denied: Customer only" });
}

/**
 * Middleware שבודק אם חשבון המשתמש פעיל.
 * מונע ממשתמשים מושבתים (is_active = 0) לבצע פעולות.
 */
function isActive(req, res, next) {
  console.log(req.session.user.first_name )
  if (req.session.user.is_active === 1) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied: Your account is inactive. Please contact support.",
  });
}



/**
 * Middleware שבודק אם הספק מאושר (status = 'approved')
 * הבדיקה מתבצעת מול טבלת chiefs או halls בהתאם לתפקיד המשתמש
 */
async function isApproved(req, res, next) {
  try {
    const userId = req.session.user.id;
    const profile = await getProfile(userId);
    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        message: "Business profile not found." 
      });
    }
    if (profile.status === "APPROVED") {
      return next(); 
    }
    return res.status(403).json({
      success: false,
      message: "Access denied: Your business is not yet approved by the admin."
    });
  } catch (error) {
    console.error("Error in isApproved middleware:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}







module.exports = { isProvider, isConnected, isAdmin, isActive, isApproved , isCustomer };
