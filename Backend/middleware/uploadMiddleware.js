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

// Company logos: small images only.
// shortcut: logo stored base64 in Firestore doc (1 MB doc limit), move to Firebase Storage if logos get bigger or the company list gets slow
const imageFilter = (req, file, cb) => {
  if (["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PNG, JPEG or WebP images are allowed."), false);
  }
};

const imageUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 300 * 1024, // 300 KB: a cropped 256x256 PNG is at most ~256 KB
  },
});

// Company banners: 300 KB. Logo + banner are each <= ~400 KB as base64, so both fit the 1 MB doc limit
const bannerUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 300 * 1024,
  },
});

module.exports = upload;
module.exports.imageUpload = imageUpload;
module.exports.bannerUpload = bannerUpload;