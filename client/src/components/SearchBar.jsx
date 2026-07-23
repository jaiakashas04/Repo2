import { useEffect, useRef, useState } from 'react';

export default function SearchBar({ value, onSearch }) {
  const [draft, setDraft] = useState(value);
  const debounceRef = useRef(null);

  useEffect(() => setDraft(value), [value]);

  const handleChange = (e) => {
    const next = e.target.value;
    setDraft(next);
    clearTimeout(debounceRef.current);
    // Debounced so a search request only fires once the user pauses typing,
    // instead of on every keystroke against a 10k+ row server-side query.
    debounceRef.current = setTimeout(() => onSearch(next), 350);
  };

  return (
    <div className="search-bar">
      <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        placeholder="Search actor, action, resource, or IP…"
        value={draft}
        onChange={handleChange}
        aria-label="Search audit logs"
      />
    </div>
  );
}
