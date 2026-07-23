import { useCallback, useEffect, useState } from 'react';
import { fetchLogs, fetchFacets } from './api/client';
import FilterBar from './components/FilterBar.jsx';
import SearchBar from './components/SearchBar.jsx';
import LogTable from './components/LogTable.jsx';
import Pagination from './components/Pagination.jsx';
import UploadPanel from './components/UploadPanel.jsx';
import LogDetailDrawer from './components/LogDetailDrawer.jsx';

const DEFAULT_FILTERS = {
  severity: '',
  status: '',
  role: '',
  resourceType: '',
  region: '',
  startDate: '',
  endDate: '',
};

export default function App() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [facets, setFacets] = useState({});
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  const loadFacets = useCallback(() => {
    fetchFacets().then(setFacets).catch(() => {});
  }, []);

  const loadLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchLogs({
      page,
      limit,
      sortBy,
      sortOrder,
      search: search || undefined,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    })
      .then((res) => {
        setLogs(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load logs. Is the API running?');
      })
      .finally(() => setLoading(false));
  }, [page, limit, sortBy, sortOrder, search, filters]);

  useEffect(loadFacets, [loadFacets]);
  useEffect(loadLogs, [loadLogs]);

  // Any filter/search/sort change resets to page 1 — otherwise the user can
  // land on an empty "page 6" after narrowing the result set.
  const handleFilterChange = (next) => {
    setFilters(next);
    setPage(1);
  };
  const handleSearch = (term) => {
    setSearch(term);
    setPage(1);
  };
  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };
  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearch('');
    setPage(1);
  };
  const handleUploaded = () => {
    loadFacets();
    loadLogs();
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">
          <span className="app-eyebrow">SECURITY OPERATIONS</span>
          <h1>Audit Log Dashboard</h1>
        </div>
        <UploadPanel onUploaded={handleUploaded} />
      </header>

      <div className="app-toolbar">
        <SearchBar value={search} onSearch={handleSearch} />
        <FilterBar facets={facets} filters={filters} onChange={handleFilterChange} onClear={handleClearFilters} />
      </div>

      {error && <div className="banner-error">{error}</div>}

      <LogTable
        logs={logs}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onSelectLog={setSelectedLog}
      />

      <Pagination
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={(n) => {
          setLimit(n);
          setPage(1);
        }}
      />

      <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
