'use client';

import { useState } from 'react';
import { api, CATEGORIES, CreateFoundItemInput, CreateLostItemInput } from '@/services/api';
import { ImageUploader } from './ImageUploader';

type ReportFormProps = { type: 'lost' | 'found' };

const CAMPUS_LOCATIONS = [
  'M Block',
  'N Block',
  'P Block',
  'Canteen',
  'Shed A',
  'Shed B',
  'Shed C',
  'Shed D',
  'A2 Seminar Hall',
  'A4 Seminar Hall',
  'Amenities Block',
  'Library',
  'Main Block',
  'Other',
];

export function ReportForm({ type }: ReportFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Main Block');
  const [customLocation, setCustomLocation] = useState('');
  const [date, setDate] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resolvedLocation = location === 'Other' ? customLocation.trim() : location.trim();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(null); setSuccess(null);

    if (!resolvedLocation) {
      setError('Please select a campus location or enter a custom location.');
      setSaving(false);
      return;
    }

    try {
      const input = { title, category, description, location: resolvedLocation, ...(type === 'lost' ? { lostDate: date } : { foundDate: date }) };
      const result = type === 'lost'
        ? await api.createLostItem(input as CreateLostItemInput)
        : await api.createFoundItem(input as CreateFoundItemInput);
      const id = result.data.id;
      if (files.length) {
        if (type === 'lost') await api.uploadLostImages(id, files);
        else await api.uploadFoundImages(id, files);
      }
      setSuccess(`${type === 'lost' ? 'Lost' : 'Found'} report submitted successfully.`);
      setTitle(''); setDescription(''); setLocation('Main Block'); setCustomLocation(''); setDate(''); setFiles([]);
    } catch (requestError: any) {
      setError(requestError.message || 'Unable to submit report.');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="campus-card space-y-5 p-6">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[var(--campus-text)]">Item title<input required minLength={3} maxLength={100} value={title} onChange={e => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--campus-border)] bg-[var(--campus-bg)] px-3 py-3 text-sm text-[var(--campus-text)] focus:border-[var(--campus-royal)] focus:outline-none focus:ring-2 focus:ring-[rgba(30,90,168,0.12)]" /></label>
        <label className="text-xs font-semibold text-[var(--campus-text)]">Category<select value={category} onChange={e => setCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--campus-border)] bg-[var(--campus-bg)] px-3 py-3 text-sm text-[var(--campus-text)] focus:border-[var(--campus-royal)] focus:outline-none focus:ring-2 focus:ring-[rgba(30,90,168,0.12)]">{CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--campus-text)]">{type === 'lost' ? 'Date lost' : 'Date found'}<input required type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--campus-border)] bg-[var(--campus-bg)] px-3 py-3 text-sm text-[var(--campus-text)] focus:border-[var(--campus-royal)] focus:outline-none focus:ring-2 focus:ring-[rgba(30,90,168,0.12)]" /></label>
        <div className="text-xs font-semibold text-[var(--campus-text)]">
          <label htmlFor="campus-location-select">Campus location</label>
          <select id="campus-location-select" value={location} onChange={e => setLocation(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--campus-border)] bg-[var(--campus-bg)] px-3 py-3 text-sm text-[var(--campus-text)] focus:border-[var(--campus-royal)] focus:outline-none focus:ring-2 focus:ring-[rgba(30,90,168,0.12)]">
            {CAMPUS_LOCATIONS.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          {location === 'Other' && (
            <input
              required
              minLength={2}
              maxLength={200}
              value={customLocation}
              onChange={e => setCustomLocation(e.target.value)}
              placeholder="Custom campus location"
              className="mt-2 w-full rounded-xl border border-[var(--campus-border)] bg-[var(--campus-bg)] px-3 py-3 text-sm text-[var(--campus-text)] focus:border-[var(--campus-royal)] focus:outline-none focus:ring-2 focus:ring-[rgba(30,90,168,0.12)]"
            />
          )}
        </div>
      </div>
      <label className="block text-xs font-semibold text-[var(--campus-text)]">Description<textarea required minLength={5} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-[var(--campus-border)] bg-[var(--campus-bg)] px-3 py-3 text-sm text-[var(--campus-text)] focus:border-[var(--campus-royal)] focus:outline-none focus:ring-2 focus:ring-[rgba(30,90,168,0.12)]" /></label>
      <ImageUploader selectedFiles={files} onChange={setFiles} />
      <button disabled={saving} className="campus-button-primary w-full px-4 py-3 text-sm disabled:opacity-50">{saving ? 'Submitting...' : `Submit ${type === 'lost' ? 'lost' : 'found'} report`}</button>
    </form>
  );
}