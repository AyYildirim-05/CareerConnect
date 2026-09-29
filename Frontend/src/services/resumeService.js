const API_URL = "http://localhost:5500/api/resumes";

export const uploadResume = async (file) => {
  const formData = new FormData();

  // Must match upload.single("resume") in the backend
  formData.append("resume", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to upload resume.");
  }

  return data;
};