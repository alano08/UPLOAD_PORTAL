import React, { useState, useCallback, useRef } from 'react';
import { Upload, CheckCircle, XCircle, File } from 'lucide-react';
import axios from 'axios';

interface FileUploadState {
  file: File | null;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error: string | null;
}

const FileUpload: React.FC = () => {
  const [uploadState, setUploadState] = useState<FileUploadState>({
    file: null,
    progress: 0,
    status: 'idle',
    error: null
  });

  const [isDragOver, setIsDragOver] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    if (file.type !== 'application/pdf') {
      return {
        isValid: false,
        error: 'Invalid file type. Only PDF files are allowed.'
      };
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds the 10MB limit. Current size: ${formatFileSize(file.size)}`
      };
    }

    return { isValid: true };
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const resetUpload = useCallback(() => {
    setUploadState({
      file: null,
      progress: 0,
      status: 'idle',
      error: null
    });
    setShowSuccessBanner(false);
  }, []);

 const handleFile = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: validation.error || 'File validation failed.'
      }));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadState({ file, status: 'uploading', error: null, progress: 0 });

    try {
      // UPDATED: API endpoint now includes the '/api' prefix.
      await axios.post('/api/upload', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadState(prev => ({ ...prev, progress: percentCompleted }));
          }
        },
      });
      
      setUploadState(prev => ({ ...prev, status: 'success', progress: 100 }));
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 5000);

    } catch (error: unknown) {
      // UPDATED: The error message now tries to use the specific error from the server.
      let errorMessage = 'Upload failed. The server did not respond.';
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      console.error('Upload failed:', error);
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage
      }));
    }
}, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="mb-6 transform transition-all duration-500 ease-out animate-in slide-in-from-top-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-green-800 font-medium">
                  Datei erfolgreich hochgeladen!
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Ihre Datei wurde sicher gespeichert und kann nun verarbeitet werden.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="p-8">
          <div
            className={`
              relative border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer
              min-h-[300px] flex flex-col items-center justify-center
              ${isDragOver 
                ? 'border-blue-400 bg-blue-50 scale-[1.02]' 
                : uploadState.status === 'error'
                ? 'border-red-300 bg-red-50'
                : uploadState.status === 'success'
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={uploadState.status === 'idle' ? handleBrowseClick : undefined}
          >
            <input
              ref={fileInputRef}
              type="file"
              // UPDATED: The 'accept' attribute now includes images.
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadState.status === 'uploading'}
            />

            <div className="text-center space-y-6">
              <div className="flex justify-center">
                {uploadState.status === 'success' ? (
                  <CheckCircle className="w-16 h-16 text-green-500" />
                ) : uploadState.status === 'error' ? (
                  <XCircle className="w-16 h-16 text-red-500" />
                ) : (
                  <Upload className={`w-16 h-16 transition-colors ${
                    isDragOver ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                )}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {uploadState.status === 'success' 
                    ? 'Upload erfolgreich!'
                    : uploadState.status === 'error'
                    ? 'Upload fehlgeschlagen'
                    : 'Dateien hierher ziehen oder klicken zum Auswählen'
                  }
                </h2>
                
                {uploadState.status === 'idle' && (
                  <div className="space-y-1">
                    <p className="text-gray-600">
                      {/* UPDATED: UI text to reflect all supported formats. */}
                      Unterstütztes Format: PDF
                    </p>
                    <p className="text-sm text-gray-500">
                      Maximale Dateigröße: 10MB
                    </p>
                  </div>
                )}

                {uploadState.status === 'uploading' && (
                  <p className="text-blue-600 font-medium">
                    Wird hochgeladen... {uploadState.progress}%
                  </p>
                )}

                {uploadState.status === 'success' && (
                  <p className="text-green-600">
                    Ihre Datei wurde erfolgreich verarbeitet.
                  </p>
                )}

                {uploadState.status === 'error' && (
                  <p className="text-red-600">
                    {uploadState.error}
                  </p>
                )}
              </div>

              {uploadState.status === 'idle' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrowseClick();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <File className="w-5 h-5" />
                  Datei auswählen
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {uploadState.status === 'uploading' && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Upload-Fortschritt</span>
                <span>{uploadState.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* File Information */}
          {uploadState.file && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadState.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadState.file.size)}
                  </p>
                </div>
                {uploadState.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          {(uploadState.status === 'success' || uploadState.status === 'error') && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={resetUpload}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Weitere Datei hochladen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;