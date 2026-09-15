import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  Database,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Layers,
  FileText,
} from "lucide-react";

interface DatabaseImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  showToast?: (message: string) => void;
}

type ImportMode = "replace" | "merge";

export const DatabaseImportModal: React.FC<DatabaseImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>("replace");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    count: number;
    total: number;
    format: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isUploading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setMode("replace");
      setError(null);
      setSuccessResult(null);
      setIsUploading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    setSuccessResult(null);
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["sqlite", "db", "json", "csv"];
    if (!ext || !validExtensions.includes(ext)) {
      setError(`Unsupported file type (.${ext}). Please select a .sqlite, .db, .json, or .csv file.`);
      return;
    }
    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "sqlite" || ext === "db") return <Database className="w-6 h-6 text-emerald-400" />;
    if (ext === "json") return <FileJson className="w-6 h-6 text-amber-400" />;
    if (ext === "csv") return <FileSpreadsheet className="w-6 h-6 text-blue-400" />;
    return <FileText className="w-6 h-6 text-zinc-400" />;
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file to import.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem("the_retro_talks_admin_token");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);

      const res = await fetch("/api/admin/backup/import", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to import database");
      }

      setSuccessResult({
        message: data.message,
        count: data.importedCount,
        total: data.totalReviews,
        format: data.format,
      });

      if (showToast) {
        showToast(`Database imported: ${data.importedCount} reviews restored!`);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      console.error("Import error:", err);
      setError(err instanceof Error ? err.message : "Failed to import database.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={!isUploading ? onClose : undefined} />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-[#090b0e] border border-white/[0.12] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(255,85,0,0.15)] flex flex-col z-10 animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.08] bg-[#0c0f16]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30 flex-shrink-0">
              <Upload className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-poppins text-white">
                  Import Database
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#ff5500]/15 text-[#ff7a29] text-[10px] font-mono font-semibold uppercase">
                  Data Restore
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-inter text-zinc-400">
                Upload your exported SQLite, JSON, or CSV file
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.04] hover:bg-[#ff5500] hover:text-black text-zinc-400 border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[78vh]">
          
          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs font-inter text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-red-200">Import Failed</p>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Success State View */}
          {successResult ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold font-poppins text-white">
                  Database Restored Successfully!
                </h4>
                <p className="text-xs font-inter text-zinc-400 max-w-sm mx-auto">
                  {successResult.message}
                </p>
              </div>

              <div className="inline-flex items-center gap-4 p-3 rounded-xl bg-[#0c0f16] border border-white/[0.08] text-xs font-inter text-zinc-300">
                <div>
                  <span className="text-[10px] uppercase font-mono text-zinc-500 block">Imported</span>
                  <span className="text-base font-bold font-poppins text-emerald-400">{successResult.count} reviews</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-zinc-500 block">Total In DB</span>
                  <span className="text-base font-bold font-poppins text-white">{successResult.total} reviews</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-zinc-500 block">Format</span>
                  <span className="text-xs font-mono font-bold text-[#ff7a29] uppercase">{successResult.format}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-poppins font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File Dropzone Area */}
              <div>
                <label className="text-xs font-semibold font-poppins text-white mb-2 block">
                  Select Backup File
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".sqlite,.db,.json,.csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {!file ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                      isDragging
                        ? "border-[#ff5500] bg-[#ff5500]/10 scale-[0.99]"
                        : "border-white/15 hover:border-[#ff5500]/50 bg-[#0c0f16]/60 hover:bg-[#0c0f16]"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 group-hover:text-[#ff5500] transition-colors">
                      <Upload className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold font-poppins text-white">
                        Click to browse or drop file here
                      </p>
                      <p className="text-[11px] text-zinc-500 font-inter mt-1">
                        Accepts official .sqlite, .db, .json, or .csv backups
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-center pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                        .sqlite / .db
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono">
                        .json
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono">
                        .csv
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#0c0f16] border border-white/[0.1] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                        {getFileIcon(file.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold font-poppins text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-red-500 hover:text-white text-zinc-400 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Import Mode Selection */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold font-poppins text-white block">
                  Import Action Mode
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Mode 1: Replace Database */}
                  <div
                    onClick={() => setMode("replace")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      mode === "replace"
                        ? "bg-[#ff5500]/10 border-[#ff5500] shadow-[0_0_20px_rgba(255,85,0,0.15)]"
                        : "bg-[#0c0f16] border-white/[0.07] hover:border-white/20 opacity-75 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`w-4 h-4 ${mode === "replace" ? "text-[#ff5500]" : "text-zinc-400"}`} />
                      <span className={`text-xs font-bold font-poppins ${mode === "replace" ? "text-white" : "text-zinc-300"}`}>
                        Replace Database
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-inter mt-1.5 leading-relaxed">
                      Wipes existing reviews and restores the file. Recommended for backup restores.
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-mono uppercase text-[#ff7a29] font-semibold">
                      Full Clean Restore
                    </span>
                  </div>

                  {/* Mode 2: Merge */}
                  <div
                    onClick={() => setMode("merge")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      mode === "merge"
                        ? "bg-[#ff5500]/10 border-[#ff5500] shadow-[0_0_20px_rgba(255,85,0,0.15)]"
                        : "bg-[#0c0f16] border-white/[0.07] hover:border-white/20 opacity-75 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className={`w-4 h-4 ${mode === "merge" ? "text-[#ff5500]" : "text-zinc-400"}`} />
                      <span className={`text-xs font-bold font-poppins ${mode === "merge" ? "text-white" : "text-zinc-300"}`}>
                        Merge with Existing
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-inter mt-1.5 leading-relaxed">
                      Appends new reviews and updates existing ones without deleting anything.
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-mono uppercase text-emerald-400 font-semibold">
                      Safe Append
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning Callout for Replace Mode */}
              {mode === "replace" && file && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-[11px] font-inter text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Notice:</strong> "Replace Database" will overwrite your current reviews with the contents of this file.
                  </span>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        {!successResult && (
          <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-white/[0.08] bg-[#0c0f16]/90 backdrop-blur-md">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-inter text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={!file || isUploading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Importing Database...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>{mode === "replace" ? "Replace & Import" : "Merge & Import"}</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
