/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  GTA CONTENT UPLOADER - MASTER COMPONENT                                    ║
 * ║  Modern React Component with Firebase Firestore + Cloudinary Integration     ║
 * ║  Dark Gaming UI | Tailwind CSS | Lucide React Icons | Production-Ready       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Upload, X, CheckCircle, AlertCircle, Zap, Play, Image as ImageIcon } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

/* ═══════════════════════════════════════════════════════════════════════════════
   CONFIGURATION: CLOUDINARY SETUP
   ═══════════════════════════════════════════════════════════════════════════════
   
   PRODUCTION SETUP CHECKLIST:
   ✓ Sign up at cloudinary.com and note your CLOUD_NAME
   ✓ Create an UNSIGNED UPLOAD PRESET (Settings > Upload > Add upload preset)
     Set it to "Unsigned" mode to prevent API key exposure client-side
   ✓ Replace below values with your actual Cloudinary credentials
*/
const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
  (typeof window !== "undefined" ? window.CLOUDINARY_CLOUD_NAME : undefined);
const CLOUDINARY_UNSIGNED_PRESET =
  import.meta.env.VITE_CLOUDINARY_UNSIGNED_PRESET ||
  (typeof window !== "undefined" ? window.CLOUDINARY_UNSIGNED_PRESET : undefined);

/* ═══════════════════════════════════════════════════════════════════════════════
   CONFIGURATION: FIREBASE INITIALIZATION (Modern Modular SDK v9+)
   ═══════════════════════════════════════════════════════════════════════════════
   
   PRODUCTION SETUP CHECKLIST:
   ✓ Replace firebaseConfig with your actual Firebase project credentials
   ✓ Configure Firestore Database Rules (see firestore.rules):
     - Allow public read access (for feed display)
     - Restrict write access to authenticated users OR allow during development
     - Example rule for testing: allow read, write: if true;
   ✓ Ensure "gta_posts" collection exists in Firestore (auto-created on first write)
*/
const firebaseConfig = {
  apiKey: 'AIzaSyD7VThxCB6PimQHqKa4Ahj8DEyCDiNX9nc',
  authDomain: 'gta6app.firebaseapp.com',
  projectId: 'gta6app',
  storageBucket: 'gta6app.firebasestorage.app',
  messagingSenderId: '681249196367',
  appId: '1:681249196367:web:f70f4f41b981b1dc7e1d3a',
  measurementId: 'G-B4VV05SPYV',
};

// Initialize Firebase Application
const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firestore Database Instance
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

/**
 * GtaContentUploader Component
 * 
 * A complete, production-ready upload component for GTA-inspired gaming content.
 * Handles file selection via drag-drop or click, local preview generation,
 * Cloudinary upload with progress tracking, and Firestore data persistence.
 */
export default function GtaContentUploader() {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState(null); // 'image' or 'video'
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedData, setUploadedData] = useState(null);
  
  const dropzoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP: Revoke blob URLs on unmount
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY: FILE TYPE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getFileType = (file) => {
    const mimeType = file.type.toLowerCase();
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'file';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPZONE: FILE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const validateFile = (file) => {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allValidTypes = [...validImageTypes, ...validVideoTypes];
    
    if (!allValidTypes.includes(file.type)) {
      setErrorMessage('❌ Invalid file type. Please upload images (JPEG, PNG, WebP, GIF) or videos (MP4, WebM, MOV).');
      return false;
    }
    
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxFileSize) {
      setErrorMessage('❌ File too large. Maximum size is 100MB.');
      return false;
    }
    
    return true;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPZONE: HANDLE FILE SELECTION & LOCAL PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleFileSelect = (file) => {
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!validateFile(file)) {
      return;
    }
    
    setSelectedFile(file);
    const fileType = getFileType(file);
    setPreviewType(fileType);
    
    // Revoke previous blob URL if exists
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    
    // Generate blob URL for instant local preview (before cloud upload)
    const blobUrl = URL.createObjectURL(file);
    previewUrlRef.current = blobUrl;
    setPreview(blobUrl);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPZONE: HANDLE CLICK UPLOAD
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPZONE: HANDLE DRAG & DROP EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.add('border-orange-500', 'bg-orange-950/20');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.remove('border-orange-500', 'bg-orange-950/20');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.remove('border-orange-500', 'bg-orange-950/20');
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOUDINARY: ASYNC UPLOAD WITH AXIOS + PROGRESS TRACKING
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('❌ No file selected. Please choose a file to upload.');
      return;
    }

    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      setErrorMessage('⚠️ Please sign in before uploading content.');
      return;
    }

    // Validate Cloudinary credentials are configured
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UNSIGNED_PRESET || CLOUDINARY_CLOUD_NAME === 'undefined' || CLOUDINARY_UNSIGNED_PRESET === 'undefined') {
      setErrorMessage('⚠️ Cloudinary credentials not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UNSIGNED_PRESET environment variables.');
      return;
    }

    // Only proceed if credentials are VALID (do NOT contain placeholder values)
    if (CLOUDINARY_CLOUD_NAME.includes('YOUR_') || CLOUDINARY_UNSIGNED_PRESET.includes('YOUR_')) {
      setErrorMessage('⚠️ Cloudinary credentials contain placeholder values. Replace them with real credentials.');
      return;
    }

    // Upload begins here with valid credentials
    setUploading(true);
    setUploadProgress(0);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Build FormData payload for Cloudinary AJAX endpoint
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', CLOUDINARY_UNSIGNED_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

      // Cloudinary Upload URL (unsigned)
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

      // Axios upload with real-time progress tracking
      const response = await axios.post(cloudinaryUrl, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploadProgress(progress);
        },
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      const { secure_url, public_id } = response.data;

      // Extract file metadata
      const fileType = getFileType(selectedFile);
      const fileName = selectedFile.name;

      // ═══════════════════════════════════════════════════════════════════
      // FIRESTORE: SAVE UPLOADED CONTENT METADATA
      // ═══════════════════════════════════════════════════════════════════
      
      const docRef = await addDoc(collection(db, 'gta_posts'), {
        secure_url: secure_url,      // Cloudinary CDN URL
        public_id: public_id,          // Cloudinary public ID (for updates/deletes)
        userId: user.uid,
        fileType: fileType,            // 'image' or 'video'
        fileName: fileName,            // Original filename
        createdAt: serverTimestamp(),  // Server-side timestamp
        uploadedAt: new Date().toISOString(),
        cloudinaryData: {
          format: response.data.format,
          width: response.data.width,
          height: response.data.height,
          bytes: response.data.bytes,
        },
      });

      // Success state
      setUploadedData({
        url: secure_url,
        publicId: public_id,
        docId: docRef.id,
        fileType: fileType,
      });
      
      setSuccessMessage(`✅ Upload successful! Content saved to Firestore (Doc ID: ${docRef.id})`);
      setUploadProgress(100);

      // Reset form after 3 seconds
      setTimeout(() => {
        resetForm();
      }, 3000);

    } catch (error) {
      console.error('Upload Error:', error);
      
      if (error.response?.data?.error?.message) {
        setErrorMessage(`❌ Upload failed: ${error.response.data.error.message}`);
      } else if (error.message === 'Network Error') {
        setErrorMessage('❌ Network error. Check your internet connection and Cloudinary credentials.');
      } else {
        setErrorMessage(`❌ Upload failed: ${error.message}`);
      }
      
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY: RESET FORM STATE
  // ═══════════════════════════════════════════════════════════════════════════
  
  const resetForm = () => {
    // Revoke blob URL before clearing state
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setSelectedFile(null);
    setPreview(null);
    setPreviewType(null);
    setUploadProgress(0);
    setUploadedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: MAIN COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-neutral-950 p-6 flex items-center justify-center font-sans">
      {/* Main Container */}
      <div className="w-full max-w-2xl">
        
        {/* Header Section */}
        <div className="mb-8 text-center border-b border-orange-600/30 pb-6">
          <h1 className="text-4xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-400 mb-2">
            GTA Content Uploader
          </h1>
          <p className="text-neutral-400 text-sm uppercase tracking-widest">
            Upload Gameplay Footage, Screenshots & Media
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/50 rounded-lg flex gap-3 items-start animate-pulse">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="ml-auto text-red-400 hover:text-red-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-950/40 border border-green-500/50 rounded-lg flex gap-3 items-start">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-400 font-semibold text-sm">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-auto text-green-400 hover:text-green-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dropzone Section */}
        <div
          ref={dropzoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickUpload}
          className="mb-6 border-2 border-dashed border-neutral-700 rounded-lg p-12 bg-neutral-900/50 cursor-pointer hover:border-orange-600/50 hover:bg-neutral-900/80 transition-all duration-300 text-center group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {!preview ? (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-orange-600/10 rounded-lg group-hover:bg-orange-600/20 transition">
                <Upload className="w-8 h-8 text-orange-500 mx-auto group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-neutral-100 font-bold uppercase text-sm tracking-wider mb-1">
                  Drop Files Here or Click to Select
                </p>
                <p className="text-neutral-500 text-xs">
                  Supports: Images (JPEG, PNG, WebP, GIF) & Videos (MP4, WebM, MOV) • Max 100MB
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-neutral-300 font-semibold uppercase text-sm tracking-wider flex items-center justify-center gap-2">
                {previewType === 'image' ? (
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                ) : (
                  <Play className="w-4 h-4 text-blue-400" />
                )}
                {previewType === 'image' ? 'Image' : 'Video'} Selected
              </div>
              <p className="text-neutral-400 text-xs">{selectedFile?.name}</p>
            </div>
          )}
        </div>

        {/* Preview Section */}
        {preview && (
          <div className="mb-6 bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden">
            <div className="p-4 bg-neutral-800/50 border-b border-neutral-700">
              <p className="text-neutral-400 text-xs uppercase tracking-widest font-semibold">
                Live Preview (Local)
              </p>
            </div>
            <div className="p-4 bg-neutral-950 flex justify-center min-h-64 items-center">
              {previewType === 'image' ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full max-h-96 object-contain rounded"
                />
              ) : (
                <video
                  src={preview}
                  autoPlay
                  muted
                  loop
                  className="max-w-full max-h-96 object-contain rounded"
                />
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-neutral-400 text-xs uppercase tracking-widest font-semibold">
                Uploading to Cloudinary
              </p>
              <p className="text-orange-500 font-bold text-sm">{uploadProgress}%</p>
            </div>
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
              <div
                className="h-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={handleClickUpload}
            disabled={uploading || !selectedFile}
            className="py-3 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 font-bold uppercase text-sm tracking-wider hover:bg-neutral-700 hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Choose Different File
          </button>
          
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-400 rounded-lg text-neutral-950 font-bold uppercase text-sm tracking-wider hover:from-orange-500 hover:to-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 shadow-lg shadow-orange-600/50"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 animate-spin" />
                Uploading...
              </span>
            ) : (
              'Upload to Cloud'
            )}
          </button>
        </div>

        {/* Uploaded Data Display */}
        {uploadedData && (
          <div className="bg-gradient-to-br from-green-950/40 to-green-900/20 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 font-semibold text-sm uppercase tracking-wider mb-3">
              ✓ Upload Complete
            </p>
            <div className="space-y-2 text-xs text-neutral-300">
              <p><span className="text-neutral-500">CDN URL:</span> {uploadedData.url}</p>
              <p><span className="text-neutral-500">Public ID:</span> {uploadedData.publicId}</p>
              <p><span className="text-neutral-500">Doc ID:</span> {uploadedData.docId}</p>
              <p><span className="text-neutral-500">Type:</span> {uploadedData.fileType}</p>
            </div>
          </div>
        )}

        {/* Production Setup Guide */}
        <div className="mt-8 pt-6 border-t border-neutral-800">
          <details className="cursor-pointer group">
            <summary className="text-neutral-500 hover:text-neutral-300 text-xs uppercase tracking-widest font-semibold flex items-center gap-2 transition">
              <span className="group-open:rotate-90 transition-transform">▶</span>
              Production Setup Checklist
            </summary>
            <div className="mt-4 space-y-2 text-xs text-neutral-400 bg-neutral-900/50 p-3 rounded border border-neutral-800 leading-relaxed">
              <p>✓ <span className="text-neutral-300">Cloudinary Setup:</span> Create unsigned upload preset at cloudinary.com settings</p>
              <p>✓ <span className="text-neutral-300">Update Credentials:</span> Replace CLOUDINARY_CLOUD_NAME and CLOUDINARY_UNSIGNED_PRESET</p>
              <p>✓ <span className="text-neutral-300">Firestore Rules:</span> Configure security rules to allow writes (or use authenticated users)</p>
              <p>✓ <span className="text-neutral-300">Collection:</span> "gta_posts" auto-created on first successful upload</p>
              <p>✓ <span className="text-neutral-300">Environment:</span> Deploy via Firebase hosting for production</p>
            </div>
          </details>
        </div>

      </div>
    </div>
  );
}

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  FIRESTORE RULES REFERENCE                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * For Development (Allow All):
 * ─────────────────────────────
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /gta_posts/{document=**} {
 *       allow read, write: if true;
 *     }
 *   }
 * }
 * 
 * For Production (Authenticated Only):
 * ──────────────────────────────────────
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /gta_posts/{document=**} {
 *       allow read: if true;
 *       allow write: if request.auth != null;
 *     }
 *   }
 * }
 */

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  INSTALLATION & USAGE                                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 1. Install Dependencies:
 *    npm install axios lucide-react firebase
 * 
 * 2. Import Component:
 *    import GtaContentUploader from './js/GtaContentUploader.jsx';
 * 
 * 3. Use in App:
 *    <GtaContentUploader />
 * 
 * 4. Configure:
 *    - Update CLOUDINARY_CLOUD_NAME and CLOUDINARY_UNSIGNED_PRESET
 *    - Verify Firebase config matches your project
 *    - Deploy Firestore rules from the reference above
 */
