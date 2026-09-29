const uploadResume = async (req, res) => {
  try {
    // Multer puts the uploaded PDF into req.file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No PDF resume was uploaded.",
      });
    }

    // For Sprint 1, confirm that the backend received the PDF.
    // Later we can add PDF parsing and database/storage integration.
    return res.status(201).json({
      success: true,
      message: "Resume uploaded successfully.",
      file: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error("Resume upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload resume.",
    });
  }
};

module.exports = {
  uploadResume,
};