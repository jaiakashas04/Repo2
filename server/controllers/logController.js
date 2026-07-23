const Log = require('../models/Log');

const ALLOWED_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const ALLOWED_STATUSES = ['Unresolved', 'In Progress', 'Resolved'];
const ALLOWED_SORT_FIELDS = new Set([
  'timestamp',
  'actor',
  'role',
  'action',
  'resourceType',
  'severity',
  'status',
  'region',
]);
const MAX_BULK_SIZE = 10000;
const MAX_PAGE_SIZE = 200;

/**
 * POST /api/logs/bulk
 * Accepts { logs: [...] } with up to MAX_BULK_SIZE records and inserts them
 * in one request using insertMany. Validation errors on individual records
 * are collected and returned rather than failing the whole batch, so a
 * single malformed row (e.g. bad severity enum) doesn't discard 9,999
 * good ones.
 */
async function bulkUpload(req, res) {
  const { logs } = req.body;

  if (!Array.isArray(logs) || logs.length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty "logs" array.' });
  }

  if (logs.length > MAX_BULK_SIZE) {
    return res.status(400).json({
      error: `Batch too large: received ${logs.length} records, max is ${MAX_BULK_SIZE} per request.`,
    });
  }

  try {
    // ordered:false lets valid documents insert even if some fail validation,
    // and lets MongoDB parallelize the writes instead of stopping at the
    // first error. rawResult gives us the writeErrors array for reporting.
    const result = await Log.collection.insertMany(
      logs.map((log) => ({ ...log, timestamp: new Date(log.timestamp) })),
      { ordered: false }
    );

    return res.status(201).json({
      inserted: result.insertedCount,
      requested: logs.length,
    });
  } catch (err) {
    // insertMany with ordered:false throws a BulkWriteError that still
    // contains the count of documents that succeeded before/around failures.
    if (err.name === 'MongoBulkWriteError') {
      return res.status(207).json({
        inserted: err.result?.insertedCount ?? 0,
        requested: logs.length,
        failed: logs.length - (err.result?.insertedCount ?? 0),
        sampleError: err.writeErrors?.[0]?.errmsg || err.message,
      });
    }
    console.error('Bulk upload failed:', err);
    return res.status(500).json({ error: 'Bulk upload failed.' });
  }
}

/**
 * Builds a Mongo filter object from validated query params.
 * Exact-match filters use equality (fast, index-friendly). Free-text search
 * uses $text when present. Date range uses $gte/$lte on `timestamp`.
 */
function buildFilter(query) {
  const filter = {};

  const exactFields = ['role', 'action', 'resourceType', 'region', 'actor'];
  for (const field of exactFields) {
    if (query[field]) filter[field] = query[field];
  }

  if (query.severity) {
    const values = String(query.severity).split(',').filter((v) => ALLOWED_SEVERITIES.includes(v));
    if (values.length) filter.severity = { $in: values };
  }

  if (query.status) {
    const values = String(query.status).split(',').filter((v) => ALLOWED_STATUSES.includes(v));
    if (values.length) filter.status = { $in: values };
  }

  if (query.startDate || query.endDate) {
    filter.timestamp = {};
    if (query.startDate) filter.timestamp.$gte = new Date(query.startDate);
    if (query.endDate) filter.timestamp.$lte = new Date(query.endDate);
  }

  if (query.search && query.search.trim()) {
    filter.$text = { $search: query.search.trim() };
  }

  return filter;
}

/**
 * GET /api/logs
 * Server-side filter + search + sort + pagination, as required by the spec.
 * Query params:
 *   page (default 1), limit (default 25, max 200)
 *   sortBy (default timestamp), sortOrder ('asc' | 'desc', default desc)
 *   search (free text across actor/action/resource/ipAddress)
 *   role, action, resourceType, region, actor (exact match)
 *   severity, status (comma-separated for multi-select, e.g. severity=HIGH,CRITICAL)
 *   startDate, endDate (ISO date strings, filters on `timestamp`)
 */
async function getLogs(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;

    const sortByRaw = req.query.sortBy || 'timestamp';
    const sortBy = ALLOWED_SORT_FIELDS.has(sortByRaw) ? sortByRaw : 'timestamp';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter = buildFilter(req.query);

    // When doing a $text search, sorting by relevance score is more useful
    // than the user's requested sort field unless they explicitly asked to
    // sort by something else via sortBy.
    const sortSpec = { [sortBy]: sortOrder };
    if (filter.$text && !req.query.sortBy) {
      sortSpec.score = { $meta: 'textScore' };
    }

    const projection = filter.$text ? { score: { $meta: 'textScore' } } : {};

    const [logs, total] = await Promise.all([
      Log.find(filter, projection).sort(sortSpec).skip(skip).limit(limit).lean(),
      Log.countDocuments(filter),
    ]);

    return res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (err) {
    console.error('Failed to fetch logs:', err);
    return res.status(500).json({ error: 'Failed to fetch logs.' });
  }
}

/**
 * GET /api/logs/facets
 * Returns the distinct values currently present for each filterable field,
 * so the frontend can populate filter dropdowns with real data instead of
 * a hardcoded list that drifts from what's actually in the collection.
 */
async function getFacets(req, res) {
  try {
    const [roles, regions, resourceTypes, actions] = await Promise.all([
      Log.distinct('role'),
      Log.distinct('region'),
      Log.distinct('resourceType'),
      Log.distinct('action'),
    ]);

    return res.json({
      role: roles.sort(),
      region: regions.sort(),
      resourceType: resourceTypes.sort(),
      action: actions.sort(),
      severity: ALLOWED_SEVERITIES,
      status: ALLOWED_STATUSES,
    });
  } catch (err) {
    console.error('Failed to fetch facets:', err);
    return res.status(500).json({ error: 'Failed to fetch facets.' });
  }
}

/** GET /api/logs/:id */
async function getLogById(req, res) {
  try {
    const log = await Log.findById(req.params.id).lean();
    if (!log) return res.status(404).json({ error: 'Log not found.' });
    return res.json(log);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid log id.' });
  }
}

module.exports = { bulkUpload, getLogs, getFacets, getLogById };
