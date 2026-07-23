import { useRef, useState } from 'react';
import { bulkUploadLogs } from '../api/client';

export default function UploadPanel({ onUploaded }) {
  const fileInputRef = useRef(null);
  const [state, setState] = useState({ status: 'idle', message: '' });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState({ status: 'reading', message: `Reading ${file.name}…` });

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const logs = Array.isArray(parsed) ? parsed : parsed.logs;

      if (!Array.isArray(logs)) {
        throw new Error('File must contain a JSON array of log records (or {"logs": [...]}).');
      }

      setState({ status: 'uploading', message: `Uploading ${logs.length.toLocaleString()} records…` });

      const result = await bulkUploadLogs(logs);

      setState({
        status: 'done',
        message: `Inserted ${result.inserted.toLocaleString()} of ${result.requested.toLocaleString()} records.`,
      });
      onUploaded?.();
    } catch (err) {
      const serverMessage = err.response?.data?.error || err.response?.data?.sampleError;
      setState({ status: 'error', message: serverMessage || err.message || 'Upload failed.' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="upload-panel">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFile}
        id="log-upload-input"
        hidden
      />
      <label htmlFor="log-upload-input" className="btn-primary">
        Upload log batch (.json)
      </label>
      {state.status !== 'idle' && (
        <span className={`upload-status upload-status--${state.status}`}>{state.message}</span>
      )}
    </div>
  );
}
