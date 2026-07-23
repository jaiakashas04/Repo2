const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Audit log record.
 *
 * Field types/enums are intentionally loose (String, not a strict enum) for
 * `role`, `action`, `resourceType`, and `region` because audit sources tend
 * to introduce new values over time (new roles, new API actions) and we do
 * not want ingestion to fail on values we didn't anticipate. `severity` and
 * `status` ARE constrained to enums because the dashboard's filter UI and
 * color-coding depend on a known, small set of values, and a bad value here
 * is more likely to be a data quality bug worth rejecting at write time.
 */
const logSchema = new Schema(
  {
    actor: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    resource: { type: String, required: true, trim: true },
    resourceType: { type: String, required: true, trim: true },
    ipAddress: { type: String, required: true, trim: true },
    region: { type: String, required: true, trim: true },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    status: {
      type: String,
      required: true,
      enum: ['Unresolved', 'In Progress', 'Resolved'],
    },
    timestamp: { type: Date, required: true },
  },
  {
    timestamps: true, // createdAt = when the record was ingested (distinct from `timestamp`, when the event happened)
  }
);

// --- Indexes ---
// Compound indexes support the common filter combinations + sort-by-timestamp
// (the default sort) without a full collection scan. Order matters: equality
// filters first, then the sort field last, per MongoDB's ESR (Equality,
// Sort, Range) guideline.
logSchema.index({ severity: 1, timestamp: -1 });
logSchema.index({ status: 1, timestamp: -1 });
logSchema.index({ region: 1, timestamp: -1 });
logSchema.index({ role: 1, timestamp: -1 });
logSchema.index({ resourceType: 1, timestamp: -1 });
logSchema.index({ timestamp: -1 }); // plain "browse latest" case, and fallback sort

// Text index powers the free-text search box across the fields an
// investigator is most likely to type into a search bar. $text is used
// instead of per-field regex because regex without an anchor can't use an
// index and forces a collection scan on every keystroke at 10k+ rows.
logSchema.index(
  { actor: 'text', action: 'text', resource: 'text', ipAddress: 'text' },
  { name: 'log_search_index', weights: { actor: 3, action: 2, resource: 2, ipAddress: 1 } }
);

module.exports = mongoose.model('Log', logSchema);
