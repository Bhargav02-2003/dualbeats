import React, { useState, useRef } from 'react';
import api from '../api/axios';

const SearchBar = ({ onResults, onLoading, playerId }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  const search = async (q) => {
    if (!q.trim()) {
      onResults([]);
      return;
    }

    setLoading(true);
    onLoading(true);
    setError('');

    try {
      const { data } = await api.get(`/api/youtube/search?q=${encodeURIComponent(q.trim())}`);
      onResults(data.results || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Search failed. Please try again.';
      setError(msg);
      onResults([]);
    } finally {
      setLoading(false);
      onLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setError('');

    // Debounce: wait 600ms after typing stops
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(value);
    }, 600);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    search(query);
  };

  const handleClear = () => {
    setQuery('');
    setError('');
    onResults([]);
    clearTimeout(debounceRef.current);
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="relative">
        {/* Search icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          {loading ? (
            <span className="spinner w-4 h-4"></span>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        <input
          id={`search-input-${playerId}`}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search for music..."
          className="form-input pl-10 pr-10"
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {error && (
        <p className="text-error text-xs mt-2 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
};

export default SearchBar;
