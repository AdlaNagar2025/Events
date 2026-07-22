const { getFullProviderData } = require("../database/queries/providers");

const handleGetProviderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const providerData = await getFullProviderData(id);

    if (!providerData) {
      return res
        .status(404)
        .json({ success: false, message: "Provider not found" });
    }

    return res.status(200).json({ success: true, data: providerData });
  } catch (error) {
    console.error(
      "Provider Controller Error (handleGetProviderDetails):",
      error,
    );
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  handleGetProviderDetails,
};
