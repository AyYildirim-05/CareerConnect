const multer = require("multer");
const path = require("path");

// Store the uploaded PDF in memory for now.
// This lets us validate/process it without permanently
// saving files to the server filesystem.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (file.mimetype === "application/pdf" && extension === ".pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = upload;