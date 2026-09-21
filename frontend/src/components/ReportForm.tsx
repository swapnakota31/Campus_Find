'use client';

import { useState } from 'react';
import { api, CATEGORIES, CreateFoundItemInput, CreateLostItemInput } from '@/services/api';
import { ImageUploader } from './ImageUploader';

type ReportFormProps = { type: 'lost' | 'found' };

export function ReportForm({ type }: ReportFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(null); setSuccess(null);
    try {
      const input = { title, category, description, location, ...(type === 'lost' ? { lostDate: date } : { foundDate: date }) };
      const result = type === 'lost'
        ? await api.createLostItem(input as CreateLostItemInput)
        : await api.createFoundItem(input as CreateFoundItemInput);
      const id = result.data.id;
      if (files.length) {
        if (type === 'lost') await api.uploadLostImages(id, files);
        else await api.uploadFoundImages(id, files);
      }
      setSuccess(`${type === 'lost' ? 'Lost' : 'Found'} report submitted successfully.`);
      setTitle(''); setDescription(''); setLocation(''); setDate(''); setFiles([]);
    } catch (requestError: any) {
      setError(requestError.message || 'Unable to submit report.');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</div>}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-300">Item title<input required minLength={3} maxLength={100} value={title} onChange={e => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white" /></label>
        <label className="text-xs font-semibold text-slate-300">Category<select value={category} onChange={e => setCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white">{CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-300">{type === 'lost' ? 'Date lost' : 'Date found'}<input required type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white" /></label>
        <label className="text-xs font-semibold text-slate-300">Campus location<input required minLength={2} maxLength={200} value={location} onChange={e => setLocation(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white" /></label>
      </div>
      <label className="block text-xs font-semibold text-slate-300">Description<textarea required minLength={5} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white" /></label>
      <ImageUploader selectedFiles={files} onChange={setFiles} />
      <button disabled={saving} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">{saving ? 'Submitting...' : `Submit ${type === 'lost' ? 'lost' : 'found'} report`}</button>
    </form>
  );
}