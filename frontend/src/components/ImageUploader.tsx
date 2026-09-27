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
      <div className="flex items-center justify-between gap-3">
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--campus-muted)]">
          Upload Photos <span className="font-normal text-[var(--campus-text)]">({selectedFiles.length}/{maxFiles})</span>
        </label>
        <span className="text-[11px] text-[var(--campus-muted)]">Max {maxSizeMB}MB each</span>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
          {error}
        </div>
      )}

      {selectedFiles.length < maxFiles && (
        <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--campus-border)] bg-[var(--campus-light)] p-4 transition-all hover:border-[var(--campus-royal)]">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--campus-border)] bg-white text-lg text-[var(--campus-royal)]">
            📷
          </div>
          <p className="text-xs font-semibold text-[var(--campus-text)] group-hover:text-[var(--campus-royal)]">
            Click to select or drag and drop images
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--campus-muted)]">Up to {maxFiles} private images</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileSelect} className="hidden" />
        </label>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3 md:grid-cols-5">
          {previews.map((item, index) => (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--campus-border)] bg-[var(--campus-light)]">
              <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(11,45,85,0.72)] p-2 text-center opacity-0 transition-opacity group-hover:opacity-100">
                <span className="mb-1 w-full truncate text-[10px] text-white">{item.name}</span>
                <button type="button" onClick={() => handleRemove(index)} className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white">
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
