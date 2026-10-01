import React, { useState } from "react";
import { uploadResume } from "../services/resumeService";

function ResumeUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    setMessage("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setUploadedFileInfo(null);
    }

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

      // Create an object URL for the uploaded PDF preview box
      const fileUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(fileUrl);
      setUploadedFileInfo({
        name: selectedFile.name,
        size: selectedFile.size,
      });
      // Stays inside the page container box (no window.open)
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setUploadedFileInfo(null);
    setMessage("");
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
          Selected file: <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
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

      {/* Indeed-style Scrollable Resume Container Box */}
      {previewUrl && (
        <div
          style={{
            marginTop: "20px",
            border: "1px solid #dcdfe3",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            backgroundColor: "#ffffff",
            maxWidth: "850px",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 18px",
              backgroundColor: "#f7f8f9",
              borderBottom: "1px solid #e4e6e8",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>📄</span>
              <strong style={{ fontSize: "14px", color: "#1e1e1e" }}>
                {uploadedFileInfo?.name || "Uploaded Resume"}
              </strong>
              <span style={{ fontSize: "12px", color: "#6e6e6e" }}>
                ({formatFileSize(uploadedFileInfo?.size)})
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  backgroundColor: "#e8f5e9",
                  color: "#2e7d32",
                  fontSize: "12px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                }}
              >
                ✓ Uploaded
              </span>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: "none",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#555",
                }}
              >
                Upload Another
              </button>
            </div>
          </div>

          {/* Scrollable PDF Document Viewer */}
          <div
            style={{
              width: "100%",
              height: "600px",
              backgroundColor: "#525659",
            }}
          >
            <iframe
              src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title="Resume Preview"
              width="100%"
              height="100%"
              style={{
                border: "none",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;