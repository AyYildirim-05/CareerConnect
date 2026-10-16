import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  uploadResume,
  uploadJsonProfile,
  fetchResumeProfile,
  exportJsonFile,
} from '../services/resumeService';

function ResumeUpload() {
  const { user, token } = useAuth();
  const jsonFileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState(null); // 'pdf' | 'json' | null
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [parsedProfile, setParsedProfile] = useState(null);
  const [savedToFirestore, setSavedToFirestore] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showRawJson, setShowRawJson] = useState(false);

  // If user already has a saved parsed resume profile in Firestore, load it initially
  useEffect(() => {
    if (user?.profile?.resumeJson) {
      setParsedProfile(user.profile.resumeJson);
      setSavedToFirestore(true);
    } else if (token) {
      fetchResumeProfile(token)
        .then((res) => {
          if (res.resumeJson) {
            setParsedProfile(res.resumeJson);
            setSavedToFirestore(true);
          }
        })
        .catch(() => {
          // No saved profile yet; normal state
        });
    }
  }, [user, token]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setMessage('');

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setUploadedFileInfo(null);
    }

    if (!file) {
      setSelectedFile(null);
      setFileType(null);
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');

    if (!isPdf && !isJson) {
      setSelectedFile(null);
      setFileType(null);
      setMessage('Please select a PDF (.pdf) or JSON (.json) resume file.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setSelectedFile(null);
      setFileType(null);
      setMessage('File must be 5 MB or smaller.');
      return;
    }

    setSelectedFile(file);
    setFileType(isJson ? 'json' : 'pdf');
  };

  const handleDirectJsonUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setMessage('Please select a valid .json file.');
      return;
    }

    try {
      setIsUploading(true);
      setMessage('');

      const text = await file.text();
      let parsedData;
      try {
        parsedData = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error('Selected file is not valid JSON. Please check file contents.');
      }

      const result = await uploadJsonProfile(parsedData, token);

      setMessage(result.message);
      setParsedProfile(result.parsedProfile);
      setSavedToFirestore(Boolean(result.savedToProfile));
      setSelectedFile(file);
      setFileType('json');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setIsUploading(false);
      if (jsonFileInputRef.current) {
        jsonFileInputRef.current.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a PDF or JSON resume file first.');
      return;
    }

    try {
      setIsUploading(true);
      setMessage('');

      if (fileType === 'json') {
        const text = await selectedFile.text();
        let jsonData;
        try {
          jsonData = JSON.parse(text);
        } catch (jsonErr) {
          throw new Error('Invalid JSON format in selected file.');
        }

        const result = await uploadJsonProfile(jsonData, token);
        setMessage(result.message);
        setParsedProfile(result.parsedProfile);
        setSavedToFirestore(Boolean(result.savedToProfile));
      } else {
        // PDF upload & parse
        const result = await uploadResume(selectedFile, token);

        setMessage(result.message);
        if (result.parsedProfile) {
          setParsedProfile(result.parsedProfile);
          setSavedToFirestore(Boolean(result.savedToProfile));
        }

        const fileUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(fileUrl);
        setUploadedFileInfo({
          name: selectedFile.name,
          size: selectedFile.size,
        });
      }
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
    setFileType(null);
    setUploadedFileInfo(null);
    setMessage('');
  };

  const handleDownloadJson = () => {
    if (!parsedProfile) return;
    const safeName = (parsedProfile.personalInfo?.fullName || user?.email || 'profile')
      .replace(/\s+/g, '_')
      .toLowerCase();
    exportJsonFile(parsedProfile, `${safeName}_resume_profile.json`);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem 0' }}>
      <h2>Resume Management & Parsing</h2>
      <p style={{ color: '#555' }}>
        Upload your resume in PDF format (maximum 5 MB). Our parser extracts your personal info, work experience,
        education, projects, skills, extracurriculars, volunteer work, and saves your profile to Firebase.
      </p>

      {/* Upload Controls Box */}
      <div
        style={{
          border: '1px solid #dcdfe3',
          padding: '1.25rem',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".pdf,application/pdf,.json,application/json"
            onChange={handleFileChange}
            id="resume-file-input"
          />

          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            style={{
              padding: '8px 18px',
              backgroundColor: '#0066cc',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedFile && !isUploading ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            {isUploading
              ? 'Uploading & Processing...'
              : fileType === 'json'
              ? 'Upload & Save JSON Profile'
              : 'Upload & Parse PDF Resume'}
          </button>

          {/* Dedicated Upload JSON Format Button */}
          <input
            type="file"
            accept=".json,application/json"
            ref={jsonFileInputRef}
            onChange={handleDirectJsonUpload}
            style={{ display: 'none' }}
            id="json-file-input"
          />
          <button
            type="button"
            onClick={() => jsonFileInputRef.current && jsonFileInputRef.current.click()}
            disabled={isUploading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4a5568',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📁 Upload JSON Format
          </button>

          {previewUrl && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: '8px 14px',
                border: '1px solid #ccc',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Clear Preview
            </button>
          )}

          {parsedProfile && (
            <button
              type="button"
              onClick={handleDownloadJson}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2e7d32',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ⬇ Download Profile JSON
            </button>
          )}
        </div>

        {selectedFile && (
          <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
            Selected: <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
          </p>
        )}

        {message && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '4px',
              backgroundColor: message.includes('Failed') || message.includes('Please') ? '#fde8e8' : '#e8f5e9',
              color: message.includes('Failed') || message.includes('Please') ? '#c53030' : '#2e7d32',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {message}
          </div>
        )}

        {savedToFirestore && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1b5e20' }}>
            <span>🔥</span>
            <span>Profile successfully synced to your Firebase user account.</span>
          </div>
        )}
      </div>

      {/* PDF Document Preview (if active) */}
      {previewUrl && (
        <div
          style={{
            marginBottom: '2rem',
            border: '1px solid #dcdfe3',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              backgroundColor: '#f7f8f9',
              borderBottom: '1px solid #e4e6e8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📄</span>
              <strong>{uploadedFileInfo?.name || 'Resume Document'}</strong>
              <small style={{ color: '#666' }}>({formatFileSize(uploadedFileInfo?.size)})</small>
            </div>
            <span
              style={{
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                fontSize: '12px',
                padding: '3px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
              }}
            >
              ✓ PDF Loaded
            </span>
          </div>

          <div style={{ width: '100%', height: '500px', backgroundColor: '#525659' }}>
            <iframe
              src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title="Resume Preview"
              width="100%"
              height="100%"
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        </div>
      )}

      {/* Parsed Profile Section */}
      {parsedProfile && (
        <div
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            marginBottom: '2rem',
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#fafbfc',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: '#1a202c' }}>
                Parsed Candidate Profile: {parsedProfile.personalInfo?.fullName || 'Extracted Profile'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                Structured categories parsed from your resume and saved in Firebase.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleDownloadJson}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#2e7d32',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ⬇ Download JSON
              </button>
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#edf2f7',
                  color: '#2d3748',
                  border: '1px solid #cbd5e0',
                  borderRadius: '4px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {showRawJson ? 'Hide Raw JSON' : '{ } View Raw JSON'}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              overflowX: 'auto',
            }}
          >
            {[
              { id: 'overview', label: 'Overview & Info' },
              { id: 'experience', label: `Experience (${parsedProfile.workExperience?.length || 0})` },
              { id: 'education', label: `Education (${parsedProfile.education?.length || 0})` },
              { id: 'skills', label: `Skills (${parsedProfile.skills?.all?.length || 0})` },
              { id: 'projects', label: `Projects (${parsedProfile.projects?.length || 0})` },
              { id: 'activities', label: `Extracurriculars (${parsedProfile.extracurriculars?.length || 0})` },
              { id: 'volunteer', label: `Volunteer (${parsedProfile.volunteerExperience?.length || 0})` },
              { id: 'certifications', label: `Certifications (${parsedProfile.certifications?.length || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid #0066cc' : '3px solid transparent',
                  backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                  color: activeTab === tab.id ? '#0066cc' : '#4a5568',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '20px' }}>
            {/* Tab: Overview & Personal Info */}
            {activeTab === 'overview' && (
              <div>
                <h4 style={{ marginTop: 0 }}>👤 Personal Information</h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '12px',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <small style={{ color: '#718096' }}>Full Name</small>
                    <div style={{ fontWeight: '600' }}>{parsedProfile.personalInfo?.fullName || 'Not detected'}</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <small style={{ color: '#718096' }}>Email</small>
                    <div style={{ fontWeight: '600' }}>{parsedProfile.personalInfo?.email || 'Not detected'}</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <small style={{ color: '#718096' }}>Phone</small>
                    <div style={{ fontWeight: '600' }}>{parsedProfile.personalInfo?.phone || 'Not detected'}</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <small style={{ color: '#718096' }}>Location</small>
                    <div style={{ fontWeight: '600' }}>{parsedProfile.personalInfo?.location || 'Not detected'}</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <small style={{ color: '#718096' }}>LinkedIn</small>
                    <div>
                      {parsedProfile.personalInfo?.linkedin ? (
                        <a href={parsedProfile.personalInfo.linkedin} target="_blank" rel="noopener noreferrer">
                          {parsedProfile.personalInfo.linkedin}
                        </a>
                      ) : (
                        'Not detected'
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <small style={{ color: '#718096' }}>GitHub</small>
                    <div>
                      {parsedProfile.personalInfo?.github ? (
                        <a href={parsedProfile.personalInfo.github} target="_blank" rel="noopener noreferrer">
                          {parsedProfile.personalInfo.github}
                        </a>
                      ) : (
                        'Not detected'
                      )}
                    </div>
                  </div>
                </div>

                {parsedProfile.personalInfo?.summary && (
                  <div>
                    <h4>📝 Professional Summary</h4>
                    <p
                      style={{
                        padding: '12px',
                        backgroundColor: '#f7fafc',
                        borderLeft: '4px solid #0066cc',
                        borderRadius: '4px',
                        lineHeight: '1.6',
                        color: '#2d3748',
                      }}
                    >
                      {parsedProfile.personalInfo.summary}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Work Experience */}
            {activeTab === 'experience' && (
              <div>
                <h4 style={{ marginTop: 0 }}>💼 Work Experience</h4>
                {parsedProfile.workExperience?.length === 0 ? (
                  <p style={{ color: '#718096' }}>No work experience entries detected.</p>
                ) : (
                  parsedProfile.workExperience?.map((exp, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '15px', color: '#1a202c' }}>{exp.title}</strong>
                        <span style={{ fontSize: '13px', color: '#718096' }}>{exp.dates}</span>
                      </div>
                      {exp.company && (
                        <div style={{ color: '#4a5568', fontWeight: '500', marginTop: '2px' }}>
                          {exp.company} {exp.location && `· ${exp.location}`}
                        </div>
                      )}
                      {exp.bullets?.length > 0 && (
                        <ul style={{ margin: '8px 0 0 16px', padding: 0, color: '#4a5568', lineHeight: '1.5' }}>
                          {exp.bullets.map((b, bIdx) => (
                            <li key={bIdx} style={{ marginBottom: '4px' }}>
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Education */}
            {activeTab === 'education' && (
              <div>
                <h4 style={{ marginTop: 0 }}>🎓 Education</h4>
                {parsedProfile.education?.length === 0 ? (
                  <p style={{ color: '#718096' }}>No education entries detected.</p>
                ) : (
                  parsedProfile.education?.map((edu, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '15px' }}>{edu.institution || 'University / College'}</strong>
                        <span style={{ fontSize: '13px', color: '#718096' }}>{edu.dates}</span>
                      </div>
                      {edu.degree && <div style={{ color: '#2b6cb0', marginTop: '4px' }}>{edu.degree}</div>}
                      {edu.gpa && (
                        <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '4px' }}>
                          <strong>GPA:</strong> {edu.gpa}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Skills */}
            {activeTab === 'skills' && (
              <div>
                <h4 style={{ marginTop: 0 }}>⚡ Skills & Competencies</h4>

                {parsedProfile.skills?.categories?.languages?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ fontSize: '14px', color: '#2d3748' }}>Programming Languages</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {parsedProfile.skills.categories.languages.map((skill, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#e6fffa',
                            color: '#234e52',
                            borderRadius: '16px',
                            fontSize: '13px',
                            border: '1px solid #b2f5ea',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedProfile.skills?.categories?.frameworksAndTools?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ fontSize: '14px', color: '#2d3748' }}>Frameworks & Tools</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {parsedProfile.skills.categories.frameworksAndTools.map((skill, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#ebf8ff',
                            color: '#2b6cb0',
                            borderRadius: '16px',
                            fontSize: '13px',
                            border: '1px solid #bee3f8',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <strong style={{ fontSize: '14px', color: '#2d3748' }}>All Detected Skills</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    {parsedProfile.skills?.all?.map((skill, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#f7fafc',
                          color: '#4a5568',
                          borderRadius: '16px',
                          fontSize: '13px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Projects */}
            {activeTab === 'projects' && (
              <div>
                <h4 style={{ marginTop: 0 }}>🚀 Projects</h4>
                {parsedProfile.projects?.length === 0 ? (
                  <p style={{ color: '#718096' }}>No projects detected.</p>
                ) : (
                  parsedProfile.projects?.map((proj, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '15px' }}>{proj.name}</strong>
                        {proj.link && (
                          <a
                            href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '13px' }}
                          >
                            View Project
                          </a>
                        )}
                      </div>
                      {proj.techStack?.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0' }}>
                          {proj.techStack.map((tech, tIdx) => (
                            <span
                              key={tIdx}
                              style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                backgroundColor: '#edf2f7',
                                color: '#4a5568',
                                borderRadius: '10px',
                              }}
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                      {proj.bullets?.length > 0 && (
                        <ul style={{ margin: '8px 0 0 16px', padding: 0, color: '#4a5568', lineHeight: '1.5' }}>
                          {proj.bullets.map((b, bIdx) => (
                            <li key={bIdx} style={{ marginBottom: '4px' }}>
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Extracurricular Activities */}
            {activeTab === 'activities' && (
              <div>
                <h4 style={{ marginTop: 0 }}>🏆 Extracurricular Activities</h4>
                {parsedProfile.extracurriculars?.length === 0 ? (
                  <p style={{ color: '#718096' }}>No extracurricular activities detected.</p>
                ) : (
                  parsedProfile.extracurriculars?.map((act, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '15px' }}>{act.title}</strong>
                        <span style={{ fontSize: '13px', color: '#718096' }}>{act.dates}</span>
                      </div>
                      {act.organization && (
                        <div style={{ color: '#4a5568', fontWeight: '500', marginTop: '2px' }}>
                          {act.organization}
                        </div>
                      )}
                      {act.description && (
                        <p style={{ margin: '6px 0 0 0', color: '#4a5568', lineHeight: '1.5' }}>
                          {act.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Volunteer Experience */}
            {activeTab === 'volunteer' && (
              <div>
                <h4 style={{ marginTop: 0 }}>🤝 Volunteer Experience</h4>
                {parsedProfile.volunteerExperience?.length === 0 ? (
                  <p style={{ color: '#718096' }}>No volunteer experience entries detected.</p>
                ) : (
                  parsedProfile.volunteerExperience?.map((vol, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '15px' }}>{vol.role}</strong>
                        <span style={{ fontSize: '13px', color: '#718096' }}>{vol.dates}</span>
                      </div>
                      {vol.organization && (
                        <div style={{ color: '#4a5568', fontWeight: '500', marginTop: '2px' }}>
                          {vol.organization}
                        </div>
                      )}
                      {vol.description && (
                        <p style={{ margin: '6px 0 0 0', color: '#4a5568', lineHeight: '1.5' }}>
                          {vol.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Certifications */}
            {activeTab === 'certifications' && (
              <div>
                <h4 style={{ marginTop: 0 }}>📜 Certifications & Additional Sections</h4>
                {parsedProfile.certifications?.length === 0 ? (
                  <p style={{ color: '#718096' }}>No certifications detected.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                    {parsedProfile.certifications?.map((cert, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          backgroundColor: '#f7fafc',
                          borderRadius: '6px',
                          border: '1px solid #edf2f7',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <strong>{cert.name}</strong>
                        <span style={{ color: '#718096', fontSize: '13px' }}>{cert.date}</span>
                      </div>
                    ))}
                  </div>
                )}

                {parsedProfile.additional?.languages?.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Languages Spoken:</strong>
                    <p style={{ margin: '4px 0', color: '#4a5568' }}>
                      {parsedProfile.additional.languages.join(', ')}
                    </p>
                  </div>
                )}

                {parsedProfile.additional?.interests?.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Interests / Hobbies:</strong>
                    <p style={{ margin: '4px 0', color: '#4a5568' }}>
                      {parsedProfile.additional.interests.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Collapsible Raw JSON Viewer */}
          {showRawJson && (
            <div
              style={{
                borderTop: '1px solid #e0e0e0',
                backgroundColor: '#1a202c',
                color: '#e2e8f0',
                padding: '16px',
                maxHeight: '400px',
                overflowY: 'auto',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ color: '#63b3ed' }}>Raw JSON Document (Stored in Firebase Firestore):</strong>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  style={{
                    backgroundColor: '#2e7d32',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '2px 8px',
                    cursor: 'pointer',
                  }}
                >
                  Download .json
                </button>
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(parsedProfile, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;