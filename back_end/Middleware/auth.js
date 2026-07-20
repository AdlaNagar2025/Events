const getProfile = require("../database/queries/adminFunc");
/**
 * Middleware: Checks if user is authenticated via Session.
 */
function isConnected(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Unauthorized: Please log in first.",
  });
}

/**
 * Middleware: Checks if the user is an active user (is_active = 1).
 */
function isActive(req, res, next) {
  if (req.session?.user?.is_active === 1) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied: Your account is inactive. Please contact support.",
  });
}

/**
 * Middleware: Checks if user has a Provider role (Chief or Hall_Owner).
 */
function isProvider(req, res, next) {
  const role = req.session?.user?.role;
  if (role === "Chief" || role === "Hall_Owner") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied: Provider access required.",
  });
}
/**
 * Middleware: Checks if user is an Admin.
 */
function isAdmin(req, res, next) {
  if (req.session?.user?.role === "Admin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied: Admin access required.",
  });
}

/**
 * Middleware: Checks if user is a Customer.
 */
function isCustomer(req, res, next) {
  if (req.session?.user?.role === "Customer") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied: Customer access required.",
  });
}

/**
 * Middleware: Checks if a provider's business status is 'APPROVED'.
 */
async function isApproved(req, res, next) {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access." });
    }

    const profile = await getProfile(userId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found.",
      });
    }

    if (profile.status === "APPROVED") {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access denied: Business profile is pending admin approval.",
    });
  } catch (error) {
    console.error("Error in isApproved middleware:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

module.exports = {
  isConnected,
  isActive,
  isProvider,
  isAdmin,
  isCustomer,
  isApproved,
};
