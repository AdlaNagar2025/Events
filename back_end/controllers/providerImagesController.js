const { getAllImages } = require("../database/queries/uploadImages");

const getProviderImagesHandler = async (req, res) => {
  try {
    const providerId = req.params.id;
    const result = await getAllImages(providerId);

    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error("Error in getProviderImagesHandler:", error);
    return res.status(500).json({
      success: false,
      message: "Server connection error.",
    });
  }
};

module.exports = { getProviderImagesHandler };
