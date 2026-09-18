'use client';

import React, { useState, useEffect } from 'react';

interface ImageUploaderProps {
  selectedFiles: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export function ImageUploader({
  selectedFiles,
  onChange,
  maxFiles = 5,
  maxSizeMB = 5,
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<{ id: string; url: string; name: string; file: File }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Generate preview URLs
    const newPreviews = selectedFiles.map((file, idx) => ({
      id: `${file.name}-${file.lastModified}-${idx}`,
      url: URL.createObjectURL(file),
      name: file.name,
      file,
    }));

    setPreviews(newPreviews);

    // Cleanup object URLs when component unmounts or selectedFiles change
    return () => {
      newPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [selectedFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (selectedFiles.length + files.length > maxFiles) {
      setError(`Maximum of ${maxFiles} images allowed per report.`);
      return;
    }

    const validFiles: File[] = [];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid image type for "${file.name}". Only JPEG, PNG, and WebP are allowed.`);
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`"${file.name}" exceeds maximum allowed file size of ${maxSizeMB}MB.`);
        return;
      }
      validFiles.push(file);
    }

    onChange([...selectedFiles, ...validFiles]);
    // Reset file input value
    e.target.value = '';
  };

  const handleRemove = (indexToRemove: number) => {
    setError(null);
    const updated = selectedFiles.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Upload Photos <span className="text-slate-500 font-normal">({selectedFiles.length}/{maxFiles})</span>
        </label>
        <span className="text-[11px] text-slate-500">Max {maxSizeMB}MB each (JPEG, PNG, WebP)</span>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* File Input Selector */}
      {selectedFiles.length < maxFiles && (
        <label className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/60 hover:bg-slate-900/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-blue-400 flex items-center justify-center text-lg mb-2">
            📷
          </div>
          <p className="text-xs font-semibold text-slate-300 group-hover:text-blue-400 transition-colors">
            Click to select or drag and drop images
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Up to {maxFiles} private images</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}

      {/* Thumbnail Previews Grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
          {previews.map((item, index) => (
            <div key={item.id} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-square">
              {/* Thumbnail Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              {/* Overlay with Remove Button */}
              <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                <span className="text-[10px] text-slate-300 truncate w-full mb-1">{item.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg transition-all shadow-md"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
