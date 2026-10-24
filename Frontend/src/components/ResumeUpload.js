import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  uploadResume,
  uploadJsonProfile,
  fetchResumeProfile,
  updateResumeProfile,
  exportJsonFile,
} from '../services/resumeService';

import './ResumeUpload.css';

function ResumeUpload() {
  const { user, token } = useAuth();
  const jsonFileInputRef = useRef(null);

  // Upload & File State
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState(null); // 'pdf' | 'json' | null
  const [statusMessage, setStatusMessage] = useState({ text: '', type: 'info' });
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);

  // Profile JSON Data State
  const [parsedProfile, setParsedProfile] = useState(null);
  const [originalSavedProfile, setOriginalSavedProfile] = useState(null);
  const [savedToFirestore, setSavedToFirestore] = useState(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState(null);

  // Edit and View Mode State
  const [isEditMode, setIsEditMode] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Raw JSON Editor State
  const [rawJsonText, setRawJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Skill Quick-add inputs
  const [newLanguageInput, setNewLanguageInput] = useState('');
  const [newToolInput, setNewToolInput] = useState('');
  const [newOtherSkillInput, setNewOtherSkillInput] = useState('');

  // Project Quick-add tech
  const [newProjectTech, setNewProjectTech] = useState({});

  // Additional section quick inputs
  const [newSpokenLangInput, setNewSpokenLangInput] = useState('');
  const [newInterestInput, setNewInterestInput] = useState('');

  // Helper to safely clone objects
  const deepClone = (obj) => JSON.parse(JSON.stringify(obj || {}));

  // Helper to ensure all required profile categories exist
  const normalizeProfile = useCallback((profile) => {
    if (!profile) return null;
    const cloned = deepClone(profile);
    cloned.personalInfo = cloned.personalInfo || {
      fullName: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: '',
      summary: '',
    };
    cloned.workExperience = Array.isArray(cloned.workExperience) ? cloned.workExperience : [];
    cloned.education = Array.isArray(cloned.education) ? cloned.education : [];
    cloned.skills = cloned.skills || { categories: {}, all: [] };
    cloned.skills.categories = cloned.skills.categories || {};
    cloned.skills.categories.languages = Array.isArray(cloned.skills.categories.languages)
      ? cloned.skills.categories.languages
      : [];
    cloned.skills.categories.frameworksAndTools = Array.isArray(cloned.skills.categories.frameworksAndTools)
      ? cloned.skills.categories.frameworksAndTools
      : [];
    cloned.skills.categories.other = Array.isArray(cloned.skills.categories.other)
      ? cloned.skills.categories.other
      : [];
    cloned.skills.all = Array.isArray(cloned.skills.all) ? cloned.skills.all : [];
    cloned.projects = Array.isArray(cloned.projects) ? cloned.projects : [];
    cloned.extracurriculars = Array.isArray(cloned.extracurriculars) ? cloned.extracurriculars : [];
    cloned.volunteerExperience = Array.isArray(cloned.volunteerExperience) ? cloned.volunteerExperience : [];
    cloned.certifications = Array.isArray(cloned.certifications) ? cloned.certifications : [];
    cloned.additional = cloned.additional || { languages: [], interests: [] };
    cloned.additional.languages = Array.isArray(cloned.additional.languages) ? cloned.additional.languages : [];
    cloned.additional.interests = Array.isArray(cloned.additional.interests) ? cloned.additional.interests : [];
    return cloned;
  }, []);

  // Set message helper
  const showNotification = (text, type = 'info') => {
    setStatusMessage({ text, type });
  };

  // Sync working profile changes and mark dirty
  const updateProfileData = (updater) => {
    setParsedProfile((prev) => {
      const updated = updater(deepClone(prev));
      setIsDirty(true);
      return updated;
    });
  };

  // Initial load: fetch saved profile from Firebase Firestore if available
  useEffect(() => {
    if (user?.profile?.resumeJson) {
      const norm = normalizeProfile(user.profile.resumeJson);
      setParsedProfile(norm);
      setOriginalSavedProfile(deepClone(norm));
      setSavedToFirestore(true);
      setLastSavedTimestamp(user.profile.resumeUpdatedAt || user.profile.resumeParsedAt || null);
    } else if (token) {
      fetchResumeProfile(token)
        .then((res) => {
          if (res.resumeJson) {
            const norm = normalizeProfile(res.resumeJson);
            setParsedProfile(norm);
            setOriginalSavedProfile(deepClone(norm));
            setSavedToFirestore(true);
            setLastSavedTimestamp(new Date().toISOString());
          }
        })
        .catch(() => {
          // Normal state if no resume uploaded yet
        });
    }
  }, [user, token, normalizeProfile]);

  // Keep Raw JSON text synced with active profile changes
  useEffect(() => {
    if (parsedProfile) {
      setRawJsonText(JSON.stringify(parsedProfile, null, 2));
    }
  }, [parsedProfile]);

  // Save current profile directly to Firebase Firestore
  const handleSaveToFirebase = useCallback(
    async (profileToSave = null) => {
      const target = profileToSave || parsedProfile;
      if (!target) return;

      if (!token) {
        showNotification(
          'Please log in to save your edited resume profile directly to Firebase.',
          'error'
        );
        return;
      }

      try {
        setIsSaving(true);
        setJsonError('');

        const result = await updateResumeProfile(target, token);

        const savedData = normalizeProfile(result.resumeJson || target);
        setParsedProfile(savedData);
        setOriginalSavedProfile(deepClone(savedData));
        setIsDirty(false);
        setSavedToFirestore(true);
        const timestamp = new Date().toISOString();
        setLastSavedTimestamp(timestamp);
        showNotification('✓ Modifications saved directly to your profile in Firebase!', 'success');
      } catch (err) {
        console.error('Save to Firebase error:', err);
        showNotification(err.message || 'Failed to save changes to Firebase.', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [token, parsedProfile, normalizeProfile]
  );

  // Auto-sync effect: automatically save changes after 1.5s of inactivity if enabled
  useEffect(() => {
    if (!autoSync || !isDirty || !token || !parsedProfile || isSaving) return;

    const timer = setTimeout(() => {
      handleSaveToFirebase(parsedProfile);
    }, 1500);

    return () => clearTimeout(timer);
  }, [parsedProfile, isDirty, autoSync, token, isSaving, handleSaveToFirebase]);

  // Revert unsaved modifications back to the last saved Firebase state
  const handleDiscardChanges = () => {
    if (!originalSavedProfile) return;
    if (window.confirm('Are you sure you want to discard all unsaved edits?')) {
      setParsedProfile(deepClone(originalSavedProfile));
      setIsDirty(false);
      showNotification('Discarded unsaved modifications.', 'info');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    showNotification('', 'info');

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
      showNotification('Please select a PDF (.pdf) or JSON (.json) resume file.', 'error');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setSelectedFile(null);
      setFileType(null);
      showNotification('File must be 5 MB or smaller.', 'error');
      return;
    }

    setSelectedFile(file);
    setFileType(isJson ? 'json' : 'pdf');
  };

  const handleDirectJsonUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      showNotification('Please select a valid .json file.', 'error');
      return;
    }

    try {
      setIsUploading(true);
      showNotification('', 'info');

      const text = await file.text();
      let parsedData;
      try {
        parsedData = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error('Selected file is not valid JSON. Please check file contents.');
      }

      const result = await uploadJsonProfile(parsedData, token);
      const normalized = normalizeProfile(result.parsedProfile || parsedData);

      showNotification(result.message || 'JSON profile synced to Firebase!', 'success');
      setParsedProfile(normalized);
      setOriginalSavedProfile(deepClone(normalized));
      setIsDirty(false);
      setSavedToFirestore(Boolean(result.savedToProfile));
      setLastSavedTimestamp(new Date().toISOString());
      setSelectedFile(file);
      setFileType('json');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setIsUploading(false);
      if (jsonFileInputRef.current) {
        jsonFileInputRef.current.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showNotification('Please select a PDF or JSON resume file first.', 'error');
      return;
    }

    try {
      setIsUploading(true);
      showNotification('', 'info');

      if (fileType === 'json') {
        const text = await selectedFile.text();
        let jsonData;
        try {
          jsonData = JSON.parse(text);
        } catch (jsonErr) {
          throw new Error('Invalid JSON format in selected file.');
        }

        const result = await uploadJsonProfile(jsonData, token);
        const normalized = normalizeProfile(result.parsedProfile || jsonData);
        showNotification(result.message || 'JSON profile saved to Firebase!', 'success');
        setParsedProfile(normalized);
        setOriginalSavedProfile(deepClone(normalized));
        setIsDirty(false);
        setSavedToFirestore(Boolean(result.savedToProfile));
        setLastSavedTimestamp(new Date().toISOString());
      } else {
        // PDF upload & parse
        const result = await uploadResume(selectedFile, token);
        showNotification(result.message || 'Resume parsed successfully!', 'success');

        if (result.parsedProfile) {
          const normalized = normalizeProfile(result.parsedProfile);
          setParsedProfile(normalized);
          setOriginalSavedProfile(deepClone(normalized));
          setIsDirty(false);
          setSavedToFirestore(Boolean(result.savedToProfile));
          setLastSavedTimestamp(new Date().toISOString());
        }

        const fileUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(fileUrl);
        setUploadedFileInfo({
          name: selectedFile.name,
          size: selectedFile.size,
        });
      }
    } catch (error) {
      showNotification(error.message, 'error');
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
    showNotification('', 'info');
  };

  const handleDownloadJson = () => {
    if (!parsedProfile) return;
    const safeName = (parsedProfile.personalInfo?.fullName || user?.email || 'profile')
      .replace(/\s+/g, '_')
      .toLowerCase();
    exportJsonFile(parsedProfile, `${safeName}_resume_profile.json`);
  };

  // ==========================================
  // FIELD MODIFICATION HANDLERS
  // ==========================================

  // 1. Personal Information
  const handlePersonalInfoChange = (field, value) => {
    updateProfileData((draft) => {
      draft.personalInfo = draft.personalInfo || {};
      draft.personalInfo[field] = value;
      // Auto-update firstName/lastName when fullName is modified
      if (field === 'fullName') {
        const parts = value.trim().split(/\s+/);
        if (parts.length > 0) {
          draft.personalInfo.firstName = parts[0];
          draft.personalInfo.lastName = parts.slice(1).join(' ');
        }
      }
      return draft;
    });
  };

  // 2. Work Experience
  const handleAddExperience = () => {
    updateProfileData((draft) => {
      draft.workExperience = draft.workExperience || [];
      draft.workExperience.unshift({
        title: '',
        company: '',
        location: '',
        dates: '',
        bullets: [''],
      });
      return draft;
    });
  };

  const handleUpdateExperience = (idx, field, value) => {
    updateProfileData((draft) => {
      if (draft.workExperience[idx]) {
        draft.workExperience[idx][field] = value;
      }
      return draft;
    });
  };

  const handleRemoveExperience = (idx) => {
    updateProfileData((draft) => {
      draft.workExperience.splice(idx, 1);
      return draft;
    });
  };

  const handleAddExperienceBullet = (expIdx) => {
    updateProfileData((draft) => {
      if (draft.workExperience[expIdx]) {
        draft.workExperience[expIdx].bullets = draft.workExperience[expIdx].bullets || [];
        draft.workExperience[expIdx].bullets.push('');
      }
      return draft;
    });
  };

  const handleUpdateExperienceBullet = (expIdx, bulletIdx, value) => {
    updateProfileData((draft) => {
      if (draft.workExperience[expIdx] && draft.workExperience[expIdx].bullets) {
        draft.workExperience[expIdx].bullets[bulletIdx] = value;
      }
      return draft;
    });
  };

  const handleRemoveExperienceBullet = (expIdx, bulletIdx) => {
    updateProfileData((draft) => {
      if (draft.workExperience[expIdx] && draft.workExperience[expIdx].bullets) {
        draft.workExperience[expIdx].bullets.splice(bulletIdx, 1);
      }
      return draft;
    });
  };

  // 3. Education
  const handleAddEducation = () => {
    updateProfileData((draft) => {
      draft.education = draft.education || [];
      draft.education.unshift({
        institution: '',
        degree: '',
        dates: '',
        gpa: '',
      });
      return draft;
    });
  };

  const handleUpdateEducation = (idx, field, value) => {
    updateProfileData((draft) => {
      if (draft.education[idx]) {
        draft.education[idx][field] = value;
      }
      return draft;
    });
  };

  const handleRemoveEducation = (idx) => {
    updateProfileData((draft) => {
      draft.education.splice(idx, 1);
      return draft;
    });
  };

  // 4. Skills
  const handleAddSkill = (category, skillName) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;

    updateProfileData((draft) => {
      draft.skills = draft.skills || { categories: {}, all: [] };
      draft.skills.categories = draft.skills.categories || {};
      draft.skills.categories[category] = draft.skills.categories[category] || [];

      if (!draft.skills.categories[category].includes(trimmed)) {
        draft.skills.categories[category].push(trimmed);
      }
      if (!draft.skills.all.includes(trimmed)) {
        draft.skills.all.push(trimmed);
      }
      return draft;
    });
  };

  const handleRemoveSkill = (category, skillName) => {
    updateProfileData((draft) => {
      if (draft.skills && draft.skills.categories && draft.skills.categories[category]) {
        draft.skills.categories[category] = draft.skills.categories[category].filter(
          (s) => s !== skillName
        );
      }
      // Also check if skill remains in any other category
      const stillInOtherCategory = Object.values(draft.skills.categories || {}).some(
        (arr) => Array.isArray(arr) && arr.includes(skillName)
      );
      if (!stillInOtherCategory) {
        draft.skills.all = draft.skills.all.filter((s) => s !== skillName);
      }
      return draft;
    });
  };

  const handleRemoveSkillFromAll = (skillName) => {
    updateProfileData((draft) => {
      if (draft.skills) {
        draft.skills.all = (draft.skills.all || []).filter((s) => s !== skillName);
        if (draft.skills.categories) {
          Object.keys(draft.skills.categories).forEach((cat) => {
            if (Array.isArray(draft.skills.categories[cat])) {
              draft.skills.categories[cat] = draft.skills.categories[cat].filter(
                (s) => s !== skillName
              );
            }
          });
        }
      }
      return draft;
    });
  };

  // 5. Projects
  const handleAddProject = () => {
    updateProfileData((draft) => {
      draft.projects = draft.projects || [];
      draft.projects.unshift({
        name: '',
        link: '',
        dates: '',
        techStack: [],
        bullets: [''],
      });
      return draft;
    });
  };

  const handleUpdateProject = (idx, field, value) => {
    updateProfileData((draft) => {
      if (draft.projects[idx]) {
        draft.projects[idx][field] = value;
      }
      return draft;
    });
  };

  const handleRemoveProject = (idx) => {
    updateProfileData((draft) => {
      draft.projects.splice(idx, 1);
      return draft;
    });
  };

  const handleAddProjectTech = (projIdx, tech) => {
    const trimmed = tech.trim();
    if (!trimmed) return;
    updateProfileData((draft) => {
      if (draft.projects[projIdx]) {
        draft.projects[projIdx].techStack = draft.projects[projIdx].techStack || [];
        if (!draft.projects[projIdx].techStack.includes(trimmed)) {
          draft.projects[projIdx].techStack.push(trimmed);
        }
      }
      return draft;
    });
  };

  const handleRemoveProjectTech = (projIdx, tech) => {
    updateProfileData((draft) => {
      if (draft.projects[projIdx] && draft.projects[projIdx].techStack) {
        draft.projects[projIdx].techStack = draft.projects[projIdx].techStack.filter(
          (t) => t !== tech
        );
      }
      return draft;
    });
  };

  const handleAddProjectBullet = (projIdx) => {
    updateProfileData((draft) => {
      if (draft.projects[projIdx]) {
        draft.projects[projIdx].bullets = draft.projects[projIdx].bullets || [];
        draft.projects[projIdx].bullets.push('');
      }
      return draft;
    });
  };

  const handleUpdateProjectBullet = (projIdx, bulletIdx, value) => {
    updateProfileData((draft) => {
      if (draft.projects[projIdx] && draft.projects[projIdx].bullets) {
        draft.projects[projIdx].bullets[bulletIdx] = value;
      }
      return draft;
    });
  };

  const handleRemoveProjectBullet = (projIdx, bulletIdx) => {
    updateProfileData((draft) => {
      if (draft.projects[projIdx] && draft.projects[projIdx].bullets) {
        draft.projects[projIdx].bullets.splice(bulletIdx, 1);
      }
      return draft;
    });
  };

  // 6. Extracurriculars
  const handleAddExtracurricular = () => {
    updateProfileData((draft) => {
      draft.extracurriculars = draft.extracurriculars || [];
      draft.extracurriculars.unshift({
        title: '',
        organization: '',
        dates: '',
        description: '',
      });
      return draft;
    });
  };

  const handleUpdateExtracurricular = (idx, field, value) => {
    updateProfileData((draft) => {
      if (draft.extracurriculars[idx]) {
        draft.extracurriculars[idx][field] = value;
      }
      return draft;
    });
  };

  const handleRemoveExtracurricular = (idx) => {
    updateProfileData((draft) => {
      draft.extracurriculars.splice(idx, 1);
      return draft;
    });
  };

  // 7. Volunteer
  const handleAddVolunteer = () => {
    updateProfileData((draft) => {
      draft.volunteerExperience = draft.volunteerExperience || [];
      draft.volunteerExperience.unshift({
        role: '',
        organization: '',
        dates: '',
        description: '',
      });
      return draft;
    });
  };

  const handleUpdateVolunteer = (idx, field, value) => {
    updateProfileData((draft) => {
      if (draft.volunteerExperience[idx]) {
        draft.volunteerExperience[idx][field] = value;
      }
      return draft;
    });
  };

  const handleRemoveVolunteer = (idx) => {
    updateProfileData((draft) => {
      draft.volunteerExperience.splice(idx, 1);
      return draft;
    });
  };

  // 8. Certifications
  const handleAddCertification = () => {
    updateProfileData((draft) => {
      draft.certifications = draft.certifications || [];
      draft.certifications.unshift({
        name: '',
        issuer: '',
        date: '',
      });
      return draft;
    });
  };

  const handleUpdateCertification = (idx, field, value) => {
    updateProfileData((draft) => {
      if (draft.certifications[idx]) {
        draft.certifications[idx][field] = value;
      }
      return draft;
    });
  };

  const handleRemoveCertification = (idx) => {
    updateProfileData((draft) => {
      draft.certifications.splice(idx, 1);
      return draft;
    });
  };

  // 9. Additional (Languages & Interests)
  const handleAddSpokenLanguage = (lang) => {
    const trimmed = lang.trim();
    if (!trimmed) return;
    updateProfileData((draft) => {
      draft.additional = draft.additional || {};
      draft.additional.languages = draft.additional.languages || [];
      if (!draft.additional.languages.includes(trimmed)) {
        draft.additional.languages.push(trimmed);
      }
      return draft;
    });
    setNewSpokenLangInput('');
  };

  const handleRemoveSpokenLanguage = (lang) => {
    updateProfileData((draft) => {
      if (draft.additional && draft.additional.languages) {
        draft.additional.languages = draft.additional.languages.filter((l) => l !== lang);
      }
      return draft;
    });
  };

  const handleAddInterest = (interest) => {
    const trimmed = interest.trim();
    if (!trimmed) return;
    updateProfileData((draft) => {
      draft.additional = draft.additional || {};
      draft.additional.interests = draft.additional.interests || [];
      if (!draft.additional.interests.includes(trimmed)) {
        draft.additional.interests.push(trimmed);
      }
      return draft;
    });
    setNewInterestInput('');
  };

  const handleRemoveInterest = (interest) => {
    updateProfileData((draft) => {
      if (draft.additional && draft.additional.interests) {
        draft.additional.interests = draft.additional.interests.filter((i) => i !== interest);
      }
      return draft;
    });
  };

  // 10. Raw JSON Editor Save
  const handleSaveRawJson = () => {
    try {
      setJsonError('');
      const parsed = JSON.parse(rawJsonText);
      const normalized = normalizeProfile(parsed);
      setParsedProfile(normalized);
      handleSaveToFirebase(normalized);
    } catch (err) {
      setJsonError(`Invalid JSON Syntax: ${err.message}`);
    }
  };

  const handleFormatRawJson = () => {
    try {
      setJsonError('');
      const parsed = JSON.parse(rawJsonText);
      setRawJsonText(JSON.stringify(parsed, null, 2));
    } catch (err) {
      setJsonError(`Cannot format: ${err.message}`);
    }
  };

  return (
    <div className="resume-container">
      <h2 className="resume-header-title">Resume Management & Parsing</h2>
      <p className="resume-subtitle">
        Upload your resume in PDF format or JSON format. You can manually edit, add, or remove any field
        over the parsed data, and all modifications sync directly to your profile in Firebase.
      </p>

      {/* Upload Controls Box */}
      <div className="resume-upload-card">
        <div className="resume-upload-actions">
          <input
            type="file"
            accept=".pdf,application/pdf,.json,application/json"
            onChange={handleFileChange}
            id="resume-file-input"
            className="resume-file-input"
          />

          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="resume-btn resume-btn-primary"
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
            className="resume-hidden-input"
            id="json-file-input"
          />
          <button
            type="button"
            onClick={() => jsonFileInputRef.current && jsonFileInputRef.current.click()}
            disabled={isUploading}
            className="resume-btn resume-btn-secondary"
          >
            📁 Upload JSON Format
          </button>

          {previewUrl && (
            <button
              type="button"
              onClick={handleClear}
              className="resume-btn resume-btn-light"
            >
              Clear Preview
            </button>
          )}

          {parsedProfile && (
            <button
              type="button"
              onClick={handleDownloadJson}
              className="resume-btn resume-btn-success"
            >
              ⬇ Download Profile JSON
            </button>
          )}
        </div>

        {selectedFile && (
          <p className="resume-selected-file">
            Selected: <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
          </p>
        )}

        {statusMessage.text && (
          <div className={`resume-status-message ${statusMessage.type}`}>
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage({ text: '', type: 'info' })}
              className="resume-status-close"
            >
              ×
            </button>
          </div>
        )}

        {savedToFirestore && (
          <div className="resume-firestore-badge">
            <span>🔥</span>
            <span>
              Profile active in Firebase Firestore
              {lastSavedTimestamp && ` (Last updated: ${new Date(lastSavedTimestamp).toLocaleTimeString()})`}
            </span>
          </div>
        )}
      </div>

      {/* PDF Document Preview (if active) */}
      {previewUrl && (
        <div className="resume-preview-card">
          <div className="resume-preview-header">
            <div className="resume-preview-file-info">
              <span>📄</span>
              <strong>{uploadedFileInfo?.name || 'Resume Document'}</strong>
              <small className="resume-text-muted">({formatFileSize(uploadedFileInfo?.size)})</small>
            </div>
            <span className="resume-preview-tag">
              ✓ PDF Loaded
            </span>
          </div>

          <div className="resume-preview-frame-container">
            <iframe
              src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title="Resume Preview"
              className="resume-preview-frame"
            />
          </div>
        </div>
      )}

      {/* Parsed & Editable Profile Section */}
      {parsedProfile && (
        <div className="resume-profile-card">
          {/* Main Action Bar & Firebase Direct Sync Header */}
          <div className="resume-profile-header">
            <div>
              <div className="resume-profile-title-row">
                <h3 className="resume-profile-title">
                  {parsedProfile.personalInfo?.fullName || 'Candidate Profile'}
                </h3>
                {isDirty ? (
                  <span className="resume-badge-unsaved">
                    ● Unsaved Changes (Save to update Firebase)
                  </span>
                ) : (
                  <span className="resume-badge-synced">
                    ✓ Synced with Firebase
                  </span>
                )}
              </div>
              <p className="resume-profile-subtitle">
                Manually edit, add, or remove fields below. Click <strong>"Save Changes to Firebase"</strong> to
                directly persist modifications in your Firebase user document.
              </p>
            </div>

            {/* Direct Firebase Persistence Controls */}
            <div className="resume-profile-actions">
              <label className="resume-autosync-toggle">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                />
                Auto-sync on edit
              </label>

              {isDirty && (
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  className="resume-btn-discard"
                >
                  ↺ Discard
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSaveToFirebase()}
                disabled={isSaving || (!isDirty && savedToFirestore)}
                className={`resume-btn resume-btn-save ${isDirty ? 'is-dirty' : 'is-synced'}`}
              >
                {isSaving ? 'Saving to Firebase...' : '💾 Save Changes to Firebase'}
              </button>

              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`resume-btn-mode-toggle ${isEditMode ? 'is-edit' : 'is-view'}`}
              >
                {isEditMode ? '👁️ Switch to View' : '✏️ Switch to Edit'}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="resume-tabs-bar">
            {[
              { id: 'overview', label: '👤 Personal Info' },
              { id: 'experience', label: `💼 Experience (${parsedProfile.workExperience?.length || 0})` },
              { id: 'education', label: `🎓 Education (${parsedProfile.education?.length || 0})` },
              { id: 'skills', label: `⚡ Skills (${parsedProfile.skills?.all?.length || 0})` },
              { id: 'projects', label: `🚀 Projects (${parsedProfile.projects?.length || 0})` },
              { id: 'activities', label: `🏆 Activities (${parsedProfile.extracurriculars?.length || 0})` },
              { id: 'volunteer', label: `🤝 Volunteer (${parsedProfile.volunteerExperience?.length || 0})` },
              { id: 'certifications', label: `📜 Certifications (${parsedProfile.certifications?.length || 0})` },
              { id: 'rawjson', label: '{ } Raw JSON Editor' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`resume-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="resume-tab-body">
            {/* TAB: Personal Information */}
            {activeTab === 'overview' && (
              <div>
                <div className="resume-section-header">
                  <h4 style={{ margin: 0 }}>👤 Personal & Contact Information</h4>
                  <small className="resume-section-hint">
                    {isEditMode ? 'Modify fields to update your identity' : 'Preview view'}
                  </small>
                </div>

                {isEditMode ? (
                  <div className="resume-form-col-gap">
                    <div className="resume-form-grid-wide">
                      <div>
                        <label className="resume-label">Full Name</label>
                        <input
                          type="text"
                          value={parsedProfile.personalInfo?.fullName || ''}
                          onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
                          placeholder="e.g. Alex Mercer"
                          className="resume-input"
                        />
                      </div>
                      <div>
                        <label className="resume-label">Email Address</label>
                        <input
                          type="email"
                          value={parsedProfile.personalInfo?.email || ''}
                          onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                          placeholder="e.g. alex@example.com"
                          className="resume-input"
                        />
                      </div>
                      <div>
                        <label className="resume-label">Phone Number</label>
                        <input
                          type="text"
                          value={parsedProfile.personalInfo?.phone || ''}
                          onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                          placeholder="e.g. (514) 123-4567"
                          className="resume-input"
                        />
                      </div>
                      <div>
                        <label className="resume-label">Location</label>
                        <input
                          type="text"
                          value={parsedProfile.personalInfo?.location || ''}
                          onChange={(e) => handlePersonalInfoChange('location', e.target.value)}
                          placeholder="e.g. Montreal, QC, Canada"
                          className="resume-input"
                        />
                      </div>
                      <div>
                        <label className="resume-label">LinkedIn Profile URL</label>
                        <input
                          type="text"
                          value={parsedProfile.personalInfo?.linkedin || ''}
                          onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
                          placeholder="https://linkedin.com/in/..."
                          className="resume-input"
                        />
                      </div>
                      <div>
                        <label className="resume-label">GitHub Profile URL</label>
                        <input
                          type="text"
                          value={parsedProfile.personalInfo?.github || ''}
                          onChange={(e) => handlePersonalInfoChange('github', e.target.value)}
                          placeholder="https://github.com/..."
                          className="resume-input"
                        />
                      </div>
                      <div>
                        <label className="resume-label">Website / Portfolio</label>
                        <input
                          type="text"
                          value={parsedProfile.personalInfo?.website || ''}
                          onChange={(e) => handlePersonalInfoChange('website', e.target.value)}
                          placeholder="https://..."
                          className="resume-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="resume-label">Professional Summary / Objective</label>
                      <textarea
                        value={parsedProfile.personalInfo?.summary || ''}
                        onChange={(e) => handlePersonalInfoChange('summary', e.target.value)}
                        placeholder="Write a concise professional summary..."
                        rows={4}
                        className="resume-textarea"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="resume-view-grid">
                      <div className="resume-view-card-item">
                        <small className="resume-view-card-label">Full Name</small>
                        <div className="resume-view-card-value">{parsedProfile.personalInfo?.fullName || 'Not provided'}</div>
                      </div>
                      <div className="resume-view-card-item">
                        <small className="resume-view-card-label">Email</small>
                        <div className="resume-view-card-value">{parsedProfile.personalInfo?.email || 'Not provided'}</div>
                      </div>
                      <div className="resume-view-card-item">
                        <small className="resume-view-card-label">Phone</small>
                        <div className="resume-view-card-value">{parsedProfile.personalInfo?.phone || 'Not provided'}</div>
                      </div>
                      <div className="resume-view-card-item">
                        <small className="resume-view-card-label">Location</small>
                        <div className="resume-view-card-value">{parsedProfile.personalInfo?.location || 'Not provided'}</div>
                      </div>
                      <div className="resume-view-card-item">
                        <small className="resume-view-card-label">LinkedIn</small>
                        <div>
                          {parsedProfile.personalInfo?.linkedin ? (
                            <a href={parsedProfile.personalInfo.linkedin} target="_blank" rel="noopener noreferrer" className="resume-link">
                              {parsedProfile.personalInfo.linkedin}
                            </a>
                          ) : (
                            'Not provided'
                          )}
                        </div>
                      </div>
                      <div className="resume-view-card-item">
                        <small className="resume-view-card-label">GitHub</small>
                        <div>
                          {parsedProfile.personalInfo?.github ? (
                            <a href={parsedProfile.personalInfo.github} target="_blank" rel="noopener noreferrer" className="resume-link">
                              {parsedProfile.personalInfo.github}
                            </a>
                          ) : (
                            'Not provided'
                          )}
                        </div>
                      </div>
                    </div>

                    {parsedProfile.personalInfo?.summary && (
                      <div>
                        <h4>Professional Summary</h4>
                        <p className="resume-summary-box">
                          {parsedProfile.personalInfo.summary}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Work Experience */}
            {activeTab === 'experience' && (
              <div>
                <div className="resume-section-header">
                  <h4 style={{ margin: 0 }}>💼 Work Experience Entries</h4>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={handleAddExperience}
                      className="resume-btn-add"
                    >
                      ➕ Add Work Experience
                    </button>
                  )}
                </div>

                {parsedProfile.workExperience?.length === 0 ? (
                  <div className="resume-empty-state">
                    <p className="resume-empty-text">No work experience entries yet.</p>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={handleAddExperience}
                        className="resume-btn-add"
                        style={{ marginTop: '10px' }}
                      >
                        ➕ Add First Experience
                      </button>
                    )}
                  </div>
                ) : (
                  parsedProfile.workExperience?.map((exp, expIdx) => (
                    <div key={expIdx} className="resume-card">
                      <div className="resume-card-header">
                        <strong className="resume-card-title">
                          #{expIdx + 1} {exp.title || 'Untitled Role'} {exp.company && `at ${exp.company}`}
                        </strong>
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExperience(expIdx)}
                            className="resume-btn-delete"
                          >
                            🗑️ Delete Entry
                          </button>
                        )}
                      </div>

                      {isEditMode ? (
                        <div>
                          <div className="resume-form-grid">
                            <div>
                              <label className="resume-label">Job Title</label>
                              <input
                                type="text"
                                value={exp.title || ''}
                                onChange={(e) => handleUpdateExperience(expIdx, 'title', e.target.value)}
                                placeholder="e.g. Software Engineer"
                                className="resume-input"
                              />
                            </div>
                            <div>
                              <label className="resume-label">Company Name</label>
                              <input
                                type="text"
                                value={exp.company || ''}
                                onChange={(e) => handleUpdateExperience(expIdx, 'company', e.target.value)}
                                placeholder="e.g. Google"
                                className="resume-input"
                              />
                            </div>
                            <div>
                              <label className="resume-label">Location</label>
                              <input
                                type="text"
                                value={exp.location || ''}
                                onChange={(e) => handleUpdateExperience(expIdx, 'location', e.target.value)}
                                placeholder="e.g. Remote / Montreal, QC"
                                className="resume-input"
                              />
                            </div>
                            <div>
                              <label className="resume-label">Dates / Duration</label>
                              <input
                                type="text"
                                value={exp.dates || ''}
                                onChange={(e) => handleUpdateExperience(expIdx, 'dates', e.target.value)}
                                placeholder="e.g. May 2022 - Present"
                                className="resume-input"
                              />
                            </div>
                          </div>

                          {/* Bullet Points */}
                          <div className="resume-bullets-section">
                            <div className="resume-bullets-header">
                              <label className="resume-label" style={{ margin: 0 }}>Bullet Points & Responsibilities</label>
                              <button
                                type="button"
                                onClick={() => handleAddExperienceBullet(expIdx)}
                                className="resume-btn-add-bullet"
                              >
                                ➕ Add Bullet
                              </button>
                            </div>

                            {(!exp.bullets || exp.bullets.length === 0) && (
                              <p className="resume-empty-bullets">
                                No bullet points added. Click "+ Add Bullet" to add one.
                              </p>
                            )}

                            {exp.bullets?.map((b, bIdx) => (
                              <div
                                key={bIdx}
                                className="resume-bullet-row"
                              >
                                <span className="resume-bullet-dot">•</span>
                                <input
                                  type="text"
                                  value={b}
                                  onChange={(e) => handleUpdateExperienceBullet(expIdx, bIdx, e.target.value)}
                                  placeholder="Describe achievement or responsibility..."
                                  className="resume-input resume-input-no-margin"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExperienceBullet(expIdx, bIdx)}
                                  className="resume-btn-remove-bullet"
                                  title="Remove bullet"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="resume-flex-between-wrap">
                            <strong style={{ fontSize: '15px', color: '#1a202c' }}>{exp.title}</strong>
                            <span style={{ fontSize: '13px', color: '#718096' }}>{exp.dates}</span>
                          </div>
                          {exp.company && (
                            <div className="resume-company-location">
                              {exp.company} {exp.location && `· ${exp.location}`}
                            </div>
                          )}
                          {exp.bullets?.length > 0 && (
                            <ul className="resume-view-bullet-list">
                              {exp.bullets.map((b, bIdx) => (
                                <li key={bIdx} className="resume-view-bullet-item">
                                  {b}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: Education */}
            {activeTab === 'education' && (
              <div>
                <div className="resume-section-header">
                  <h4 style={{ margin: 0 }}>🎓 Education Entries</h4>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={handleAddEducation}
                      className="resume-btn-add"
                    >
                      ➕ Add Education
                    </button>
                  )}
                </div>

                {parsedProfile.education?.length === 0 ? (
                  <div className="resume-empty-state">
                    <p className="resume-empty-text">No education entries detected.</p>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={handleAddEducation}
                        className="resume-btn-add"
                        style={{ marginTop: '10px' }}
                      >
                        ➕ Add First Education
                      </button>
                    )}
                  </div>
                ) : (
                  parsedProfile.education?.map((edu, eduIdx) => (
                    <div key={eduIdx} className="resume-card">
                      <div className="resume-card-header">
                        <strong className="resume-card-title">
                          #{eduIdx + 1} {edu.institution || 'University / College'}
                        </strong>
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEducation(eduIdx)}
                            className="resume-btn-delete"
                          >
                            🗑️ Delete Entry
                          </button>
                        )}
                      </div>

                      {isEditMode ? (
                        <div className="resume-form-grid">
                          <div>
                            <label className="resume-label">Institution / University</label>
                            <input
                              type="text"
                              value={edu.institution || ''}
                              onChange={(e) => handleUpdateEducation(eduIdx, 'institution', e.target.value)}
                              placeholder="e.g. Concordia University"
                              className="resume-input"
                            />
                          </div>
                          <div>
                            <label className="resume-label">Degree / Field of Study</label>
                            <input
                              type="text"
                              value={edu.degree || ''}
                              onChange={(e) => handleUpdateEducation(eduIdx, 'degree', e.target.value)}
                              placeholder="e.g. B.Eng. in Software Engineering"
                              className="resume-input"
                            />
                          </div>
                          <div>
                            <label className="resume-label">Dates / Graduation Year</label>
                            <input
                              type="text"
                              value={edu.dates || ''}
                              onChange={(e) => handleUpdateEducation(eduIdx, 'dates', e.target.value)}
                              placeholder="e.g. 2020 - 2024"
                              className="resume-input"
                            />
                          </div>
                          <div>
                            <label className="resume-label">GPA (optional)</label>
                            <input
                              type="text"
                              value={edu.gpa || ''}
                              onChange={(e) => handleUpdateEducation(eduIdx, 'gpa', e.target.value)}
                              placeholder="e.g. 3.8 / 4.0"
                              className="resume-input"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="resume-flex-between-wrap">
                            <strong style={{ fontSize: '15px' }}>{edu.institution}</strong>
                            <span style={{ fontSize: '13px', color: '#718096' }}>{edu.dates}</span>
                          </div>
                          {edu.degree && <div style={{ color: '#2b6cb0', marginTop: '4px' }}>{edu.degree}</div>}
                          {edu.gpa && (
                            <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '4px' }}>
                              <strong>GPA:</strong> {edu.gpa}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: Skills */}
            {activeTab === 'skills' && (
              <div>
                <div className="resume-section-header">
                  <h4 style={{ margin: 0 }}>⚡ Skills & Technologies</h4>
                  <small className="resume-section-hint">
                    {isEditMode ? 'Click × on any skill to remove, or use the inputs to add new ones' : 'View only'}
                  </small>
                </div>

                {/* Programming Languages */}
                <div className="resume-card">
                  <strong className="resume-card-title">Programming Languages</strong>
                  <div className="resume-badge-group">
                    {parsedProfile.skills?.categories?.languages?.map((skill, idx) => (
                      <span
                        key={idx}
                        className="resume-skill-badge badge-teal"
                      >
                        {skill}
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill('languages', skill)}
                            className="resume-skill-remove"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {isEditMode && (
                    <div className="resume-skill-input-row">
                      <input
                        type="text"
                        value={newLanguageInput}
                        onChange={(e) => setNewLanguageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill('languages', newLanguageInput);
                            setNewLanguageInput('');
                          }
                        }}
                        placeholder="Add programming language (e.g. Rust, Go)..."
                        className="resume-input resume-skill-input"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleAddSkill('languages', newLanguageInput);
                          setNewLanguageInput('');
                        }}
                        className="resume-skill-add-btn btn-teal"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Frameworks & Tools */}
                <div className="resume-card">
                  <strong className="resume-card-title">Frameworks, Libraries & Databases</strong>
                  <div className="resume-badge-group">
                    {parsedProfile.skills?.categories?.frameworksAndTools?.map((skill, idx) => (
                      <span
                        key={idx}
                        className="resume-skill-badge badge-blue"
                      >
                        {skill}
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill('frameworksAndTools', skill)}
                            className="resume-skill-remove"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {isEditMode && (
                    <div className="resume-skill-input-row">
                      <input
                        type="text"
                        value={newToolInput}
                        onChange={(e) => setNewToolInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill('frameworksAndTools', newToolInput);
                            setNewToolInput('');
                          }
                        }}
                        placeholder="Add framework or tool (e.g. Next.js, Docker)..."
                        className="resume-input resume-skill-input"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleAddSkill('frameworksAndTools', newToolInput);
                          setNewToolInput('');
                        }}
                        className="resume-skill-add-btn btn-blue"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Other Skills & Total Competencies */}
                <div className="resume-card">
                  <strong className="resume-card-title">All Detected Competencies & Skills</strong>
                  <div className="resume-badge-group">
                    {parsedProfile.skills?.all?.map((skill, idx) => (
                      <span
                        key={idx}
                        className="resume-skill-badge badge-gray"
                      >
                        {skill}
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkillFromAll(skill)}
                            className="resume-skill-remove"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  {isEditMode && (
                    <div className="resume-skill-input-row">
                      <input
                        type="text"
                        value={newOtherSkillInput}
                        onChange={(e) => setNewOtherSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill('other', newOtherSkillInput);
                            setNewOtherSkillInput('');
                          }
                        }}
                        placeholder="Add other skill (e.g. CI/CD, Agile, System Design)..."
                        className="resume-input resume-skill-input"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleAddSkill('other', newOtherSkillInput);
                          setNewOtherSkillInput('');
                        }}
                        className="resume-skill-add-btn btn-gray"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Projects */}
            {activeTab === 'projects' && (
              <div>
                <div className="resume-section-header">
                  <h4 style={{ margin: 0 }}>🚀 Projects</h4>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={handleAddProject}
                      className="resume-btn-add"
                    >
                      ➕ Add Project
                    </button>
                  )}
                </div>

                {parsedProfile.projects?.length === 0 ? (
                  <div className="resume-empty-state">
                    <p className="resume-empty-text">No projects detected.</p>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={handleAddProject}
                        className="resume-btn-add"
                        style={{ marginTop: '10px' }}
                      >
                        ➕ Add First Project
                      </button>
                    )}
                  </div>
                ) : (
                  parsedProfile.projects?.map((proj, projIdx) => (
                    <div key={projIdx} className="resume-card">
                      <div className="resume-card-header">
                        <strong className="resume-card-title">
                          #{projIdx + 1} {proj.name || 'Untitled Project'}
                        </strong>
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProject(projIdx)}
                            className="resume-btn-delete"
                          >
                            🗑️ Delete Entry
                          </button>
                        )}
                      </div>

                      {isEditMode ? (
                        <div>
                          <div className="resume-form-grid">
                            <div>
                              <label className="resume-label">Project Name</label>
                              <input
                                type="text"
                                value={proj.name || ''}
                                onChange={(e) => handleUpdateProject(projIdx, 'name', e.target.value)}
                                placeholder="e.g. CareerConnect"
                                className="resume-input"
                              />
                            </div>
                            <div>
                              <label className="resume-label">Project Link / Repo URL</label>
                              <input
                                type="text"
                                value={proj.link || ''}
                                onChange={(e) => handleUpdateProject(projIdx, 'link', e.target.value)}
                                placeholder="https://github.com/..."
                                className="resume-input"
                              />
                            </div>
                            <div>
                              <label className="resume-label">Dates (optional)</label>
                              <input
                                type="text"
                                value={proj.dates || ''}
                                onChange={(e) => handleUpdateProject(projIdx, 'dates', e.target.value)}
                                placeholder="e.g. Fall 2023"
                                className="resume-input"
                              />
                            </div>
                          </div>

                          {/* Tech Stack Tags */}
                          <div style={{ marginTop: '10px' }}>
                            <label className="resume-label">Technologies Used</label>
                            <div className="resume-project-tags">
                              {proj.techStack?.map((t, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="resume-project-tag"
                                >
                                  {t}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveProjectTech(projIdx, t)}
                                    className="resume-tag-remove"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="resume-project-tag-input-row">
                              <input
                                type="text"
                                value={newProjectTech[projIdx] || ''}
                                onChange={(e) =>
                                  setNewProjectTech({ ...newProjectTech, [projIdx]: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddProjectTech(projIdx, newProjectTech[projIdx] || '');
                                    setNewProjectTech({ ...newProjectTech, [projIdx]: '' });
                                  }
                                }}
                                placeholder="Add tech tag (e.g. React, Docker)..."
                                className="resume-input resume-project-tag-input"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  handleAddProjectTech(projIdx, newProjectTech[projIdx] || '');
                                  setNewProjectTech({ ...newProjectTech, [projIdx]: '' });
                                }}
                                className="resume-project-tag-btn"
                              >
                                + Tag
                              </button>
                            </div>
                          </div>

                          {/* Bullet Points */}
                          <div className="resume-bullets-section">
                            <div className="resume-bullets-header">
                              <label className="resume-label" style={{ margin: 0 }}>Key Features & Achievements</label>
                              <button
                                type="button"
                                onClick={() => handleAddProjectBullet(projIdx)}
                                className="resume-btn-add-bullet"
                              >
                                ➕ Add Bullet
                              </button>
                            </div>

                            {proj.bullets?.map((b, bIdx) => (
                              <div
                                key={bIdx}
                                className="resume-bullet-row"
                              >
                                <span className="resume-bullet-dot">•</span>
                                <input
                                  type="text"
                                  value={b}
                                  onChange={(e) => handleUpdateProjectBullet(projIdx, bIdx, e.target.value)}
                                  placeholder="Describe project details..."
                                  className="resume-input resume-input-no-margin"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProjectBullet(projIdx, bIdx)}
                                  className="resume-btn-remove-bullet"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="resume-flex-between">
                            <strong style={{ fontSize: '15px' }}>{proj.name}</strong>
                            {proj.link && (
                              <a
                                href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="resume-link"
                              >
                                View Project
                              </a>
                            )}
                          </div>
                          {proj.techStack?.length > 0 && (
                            <div className="resume-project-tags">
                              {proj.techStack.map((tech, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="resume-project-tag"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                          {proj.bullets?.length > 0 && (
                            <ul className="resume-view-bullet-list">
                              {proj.bullets.map((b, bIdx) => (
                                <li key={bIdx} className="resume-view-bullet-item">
                                  {b}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: Extracurricular Activities */}
            {activeTab === 'activities' && (
              <div>
                <div className="resume-section-header">
                  <h4 style={{ margin: 0 }}>🏆 Extracurricular Activities</h4>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={handleAddExtracurricular}
                      className="resume-btn-add"
                    >
                      ➕ Add Activity
                    </button>
                  )}
                </div>

                {parsedProfile.extracurriculars?.length === 0 ? (
                  <div className="resume-empty-state">
                    <p className="resume-empty-text">No extracurricular activities detected.</p>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={handleAddExtracurricular}
                        className="resume-btn-add"
                        style={{ marginTop: '10px' }}
                      >
                        ➕ Add First Activity
                      </button>
                    )}
                  </div>
                ) : (
                  parsedProfile.extracurriculars?.map((act, actIdx) => (
                    <div key={actIdx} className="resume-card">
                      <div className="resume-card-header">
                        <strong className="resume-card-title">
                          #{actIdx + 1} {act.title || 'Activity'}
                        </strong>
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExtracurricular(actIdx)}
                            className="resume-btn-delete"
                          >
                            🗑️ Delete Entry
                          </button>
                        )}
                      </div>

                      {isEditMode ? (
                        <div className="resume-form-col-gap-sm">
                          <div className="resume-form-grid">
                            <div>
                              <label className="resume-label">Role / Title</label>
                              <input
                                type="text"
                                value={act.title || ''}
                                onChange={(e) => handleUpdateExtracurricular(actIdx, 'title', e.target.value)}
                                placeholder="e.g. President / Member"
                                className="resume-input"
                              />
                            </div>
                            <div>
                              <label className="resume-label">Organization / Club</label>
                              <input
                                type="text"
                                value={act.organization || ''}
                                onChange={(e) =>
                                  handleUpdateExtracurricular(actIdx, 'organization', e.target.value)
                                }
                                placeholder="e.g. Engineering Student Society"
                                className="resume-input"
                              />
                            </div>
                            <div>
                              <label className="resume-label">Dates</label>
                              <input
                                type="text"
                                value={act.dates || ''}
                                onChange={(e) => handleUpdateExtracurricular(actIdx, 'dates', e.target.value)}
                                placeholder="e.g. 2022 - 2023"
                                className="resume-input"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="resume-label">Description / Highlights</label>
                            <textarea
                              value={act.description || ''}
                              onChange={(e) =>
                                handleUpdateExtracurricular(actIdx, 'description', e.target.value)
                              }
                              placeholder="Describe your role and activities..."
                              rows={2}
                              className="resume-textarea"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="resume-flex-between-wrap">
                            <strong style={{ fontSize: '15px' }}>{act.title}</strong>
                            <span style={{ fontSize: '13px', color: '#718096' }}>{act.dates}</span>
                          </div>
                          {act.organization && (
                            <div className="resume-company-location">
                              {act.organization}
                            </div>
                          )}
                          {act.description && (
                            <p style={{ margin: '6px 0 0 0', color: '#4a5568', lineHeight: '1.5' }}>
                              {act.description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: Volunteer Experience */}
            {activeTab === 'volunteer' && (
              <div>
                <div className="resume-section-header">
                  <h4 style={{ margin: 0 }}>🤝 Volunteer Experience</h4>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={handleAddVolunteer}
                      className="resume-btn-add"
                    >
                      ➕ Add Volunteer Experience
                    </button>
                  )}
                </div>

                {parsedProfile.volunteerExperience?.length === 0 ? (
                  <div className="resume-empty-state">
                    <p className="resume-empty-text">No volunteer experience detected.</p>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={handleAddVolunteer}
                        className="resume-btn-add"
                        style={{ marginTop: '10px' }}
                      >
                        ➕ Add First Volunteer Entry
                      </button>
                    )}
                  </div>
                ) : (
                  parsedProfile.volunteerExperience?.map((vol, volIdx) => (
                    <div key={volIdx} className="resume-card">
                      <div className="resume-card-header">
                        <strong className="resume-card-title">
                          #{volIdx + 1} {vol.role || 'Volunteer'}
                        </strong>
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVolunteer(volIdx)}
                            className="resume-btn-delete"
                          >
                            🗑️ Delete Entry
                          </button>
                        )}
                      </div>

                      {isEditMode ? (
                        <div className="resume-form-col-gap-sm">
                          <div className="resume-form-grid">
                            <div>
                              <label className="resume-label">Role / Title</label>
                              <input
                                type="text"
                                value={vol.role || ''}
                                onChange={(e) => handleUpdateVolunteer(volIdx, 'role', e.target.value)}
                                placeholder="e.g. Volunteer Mentor"
                                className="resume-input"
                              />
                            </div>
                            <div>
                              <label className="resume-label">Organization</label>
                              <input
                                type="text"
                                value={vol.organization || ''}
                                onChange={(e) =>
                                  handleUpdateVolunteer(volIdx, 'organization', e.target.value)
                                }
                                placeholder="e.g. Canada Learning Code"
                                className="resume-input"
                              />
                            </div>
                            <div>
                              <label className="resume-label">Dates</label>
                              <input
                                type="text"
                                value={vol.dates || ''}
                                onChange={(e) => handleUpdateVolunteer(volIdx, 'dates', e.target.value)}
                                placeholder="e.g. 2021 - 2022"
                                className="resume-input"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="resume-label">Description / Contribution</label>
                            <textarea
                              value={vol.description || ''}
                              onChange={(e) => handleUpdateVolunteer(volIdx, 'description', e.target.value)}
                              placeholder="Describe your volunteer contributions..."
                              rows={2}
                              className="resume-textarea"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="resume-flex-between-wrap">
                            <strong style={{ fontSize: '15px' }}>{vol.role}</strong>
                            <span style={{ fontSize: '13px', color: '#718096' }}>{vol.dates}</span>
                          </div>
                          {vol.organization && (
                            <div className="resume-company-location">
                              {vol.organization}
                            </div>
                          )}
                          {vol.description && (
                            <p style={{ margin: '6px 0 0 0', color: '#4a5568', lineHeight: '1.5' }}>
                              {vol.description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: Certifications & Additional Info */}
            {activeTab === 'certifications' && (
              <div>
                <div className="resume-section-header">
                  <h4 style={{ margin: 0 }}>📜 Certifications & Honors</h4>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={handleAddCertification}
                      className="resume-btn-add"
                    >
                      ➕ Add Certification
                    </button>
                  )}
                </div>

                {parsedProfile.certifications?.length === 0 ? (
                  <p className="resume-text-muted">No certifications detected.</p>
                ) : (
                  <div className="resume-cert-list">
                    {parsedProfile.certifications?.map((cert, certIdx) => (
                      <div
                        key={certIdx}
                        className="resume-cert-item"
                      >
                        {isEditMode ? (
                          <div className="resume-cert-edit-row">
                            <input
                              type="text"
                              value={cert.name || ''}
                              onChange={(e) => handleUpdateCertification(certIdx, 'name', e.target.value)}
                              placeholder="Certification or Award Name"
                              className="resume-input resume-cert-input-wide"
                            />
                            <input
                              type="text"
                              value={cert.issuer || ''}
                              onChange={(e) => handleUpdateCertification(certIdx, 'issuer', e.target.value)}
                              placeholder="Issuer / Authority (e.g. AWS)"
                              className="resume-input resume-cert-input-sm"
                            />
                            <input
                              type="text"
                              value={cert.date || ''}
                              onChange={(e) => handleUpdateCertification(certIdx, 'date', e.target.value)}
                              placeholder="Date (e.g. 2023)"
                              className="resume-input resume-cert-input-sm"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveCertification(certIdx)}
                              className="resume-btn-delete"
                            >
                              🗑️
                            </button>
                          </div>
                        ) : (
                          <div className="resume-cert-view-row">
                            <div>
                              <strong>{cert.name}</strong>
                              {cert.issuer && <span className="resume-cert-issuer">· {cert.issuer}</span>}
                            </div>
                            <span className="resume-cert-date">{cert.date}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Additional Languages Spoken */}
                <div className="resume-card" style={{ marginTop: '1.5rem' }}>
                  <strong className="resume-card-title">🗣️ Spoken Languages</strong>
                  <div className="resume-badge-group">
                    {parsedProfile.additional?.languages?.map((lang, lIdx) => (
                      <span
                        key={lIdx}
                        className="resume-skill-badge badge-purple"
                      >
                        {lang}
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSpokenLanguage(lang)}
                            className="resume-skill-remove"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {isEditMode && (
                    <div className="resume-skill-input-row">
                      <input
                        type="text"
                        value={newSpokenLangInput}
                        onChange={(e) => setNewSpokenLangInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSpokenLanguage(newSpokenLangInput);
                          }
                        }}
                        placeholder="Add spoken language (e.g. English, French)..."
                        className="resume-input resume-skill-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSpokenLanguage(newSpokenLangInput)}
                        className="resume-skill-add-btn btn-purple"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Additional Interests / Hobbies */}
                <div className="resume-card">
                  <strong className="resume-card-title">🎨 Interests & Hobbies</strong>
                  <div className="resume-badge-group">
                    {parsedProfile.additional?.interests?.map((item, iIdx) => (
                      <span
                        key={iIdx}
                        className="resume-skill-badge badge-orange"
                      >
                        {item}
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInterest(item)}
                            className="resume-skill-remove"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {isEditMode && (
                    <div className="resume-skill-input-row">
                      <input
                        type="text"
                        value={newInterestInput}
                        onChange={(e) => setNewInterestInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInterest(newInterestInput);
                          }
                        }}
                        placeholder="Add interest (e.g. Open Source, Photography)..."
                        className="resume-input resume-skill-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddInterest(newInterestInput)}
                        className="resume-skill-add-btn btn-orange"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Raw JSON Editor (Direct JSON modifying) */}
            {activeTab === 'rawjson' && (
              <div>
                <div className="resume-json-header">
                  <div>
                    <h4 style={{ margin: 0 }}>{'{ }'} Direct JSON File Editor</h4>
                    <p className="resume-profile-subtitle">
                      Edit the raw JSON profile document directly. Changes are validated and saved straight to Firebase.
                    </p>
                  </div>

                  <div className="resume-json-actions">
                    <button
                      type="button"
                      onClick={handleFormatRawJson}
                      className="resume-btn resume-btn-light"
                    >
                      ✨ Format JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadJson}
                      className="resume-btn resume-btn-success"
                    >
                      ⬇ Download .json
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRawJson}
                      disabled={isSaving}
                      className="resume-btn resume-btn-primary"
                    >
                      {isSaving ? 'Saving...' : '💾 Apply & Save to Firebase'}
                    </button>
                  </div>
                </div>

                {jsonError && (
                  <div className="resume-json-error">
                    ⚠️ {jsonError}
                  </div>
                )}

                <textarea
                  value={rawJsonText}
                  onChange={(e) => {
                    setRawJsonText(e.target.value);
                    setJsonError('');
                    setIsDirty(true);
                  }}
                  rows={22}
                  className="resume-json-textarea"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;
