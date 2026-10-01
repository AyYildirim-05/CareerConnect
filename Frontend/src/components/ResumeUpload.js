import React, { useState } from "react";
import { uploadResume } from "../services/resumeService";

function ResumeUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    setMessage("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Frontend validation
    if (file.type !== "application/pdf") {
      setSelectedFile(null);
      setMessage("Please select a PDF file.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setSelectedFile(null);
      setMessage("PDF must be 5 MB or smaller.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("Please select a PDF resume first.");
      return;
    }

    try {
      setIsUploading(true);
      setMessage("");

      const result = await uploadResume(selectedFile);

      setMessage(result.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h2>Upload Resume</h2>

      <p>Upload your resume in PDF format (maximum 5 MB).</p>

      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
      />

      {selectedFile && (
        <p>
          Selected file: <strong>{selectedFile.name}</strong>
        </p>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
      >
        {isUploading ? "Uploading..." : "Upload Resume"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}

export default ResumeUpload;