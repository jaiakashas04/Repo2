# Audit Log Dashboard

A dashboard for security engineers to bulk-upload, browse, filter, search, sort, and
investigate system audit logs. Built for the Gidy full-stack exercise.

**Stack:** React (Vite) · Node.js · Express · MongoDB (Mongoose)

```
gidy-audit-dashboard/
├── server/     Express API + MongoDB models
└── client/     React dashboard (Vite)
```

---

## 1. Setup

### Prerequisites
- Node.js 18+
- A MongoDB instance — either [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier is enough)
  or a local `mongod`.

### Backend

```bash
cd server
npm install
cp .env.example .env      # then fill in MONGODB_URI
npm run dev               # The deployed backend is:   
# https://repo2-1ext.onrender.com 
```

To try it out with data immediately:

```bash
npm run seed                # writes server/scripts/sample-logs.json (10,000 records)
node scripts/seed.js 10000 --insert   # also inserts them straight into MongoDB
```

Or upload `scripts/sample-logs.json` through the dashboard's own **Upload log batch**
button once both servers are running — that exercises the actual bulk API instead of
bypassing it.

### Frontend

```bash
cd client
npm install
cp .env.example .env      # The default API points to the deployed backend:
# VITE_API_BASE_URL, defaults to https://repo2-1ext.onrender.com/api 
npm run dev                 # Frontend: http://localhost:5173
```

### Production build

```bash
cd client && npm run build   # outputs client/dist, served by any static host
```

---

## 2. API

| Method | Endpoint            | Description                                                  |
|--------|----------------------|----------------------------------------------------------------|
| POST   | `/api/logs/bulk`     | Body `{ "logs": [...] }`, up to 10,000 records, one request  |
| GET    | `/api/logs`          | Filter + search + sort + paginate (all server-side)          |
| GET    | `/api/logs/facets`   | Distinct values per field, to populate filter dropdowns      |
| GET    | `/api/logs/:id`      | Single record, for the investigate drawer                    |
| GET    | `/api/health`        | Liveness check                                                |

`GET /api/logs` query params:

- `page`, `limit` (default 25, max 200)
- `sortBy` (`timestamp`, `actor`, `role`, `action`, `resourceType`, `severity`, `status`, `region`), `sortOrder` (`asc`/`desc`)
- `search` — free text across actor / action / resource / IP address
- `role`, `action`, `resourceType`, `region`, `actor` — exact match
- `severity`, `status` — comma-separated for multi-select, e.g. `severity=HIGH,CRITICAL`
- `startDate`, `endDate` — ISO dates, filtered against `timestamp`

---

## 3. Technical decisions

**Bulk insert via `insertMany({ ordered: false })`, not a loop of single inserts.**
`ordered:false` lets MongoDB write documents in parallel and, importantly, lets valid
documents succeed even if a few records in the batch fail schema validation — a single
malformed row out of 10,000 shouldn't sink the whole upload. The controller reports how
many of the requested records actually landed, and surfaces a sample validation error
if any failed, so the caller can tell partial success from total success.

**All filtering, search, sorting, and pagination happen in the Mongo query, not in
JS after fetching.** The spec calls this out explicitly, and it's also the only approach
that scales — pulling 10,000+ rows into Node to slice/filter in memory on every request
would be needless load and latency. `buildFilter()` composes a single Mongo filter
object from query params; `find().sort().skip().limit()` and a parallel `countDocuments()`
do the rest.

**Indexes are built around the actual query shapes, not "index everything."**
Compound indexes pair each common filter field with `timestamp` (the default sort),
following Mongo's Equality→Sort→Range ordering guidance, so the common case (filter by
severity/status/region/role + sort by time) can use an index instead of scanning the
collection. A text index (`log_search_index`) backs the search box, weighted toward
`actor` since that's the field investigators search on most.

**Search uses MongoDB's `$text` index instead of per-field regex.** An unanchored regex
(`/term/i`) can't use an index and forces a full collection scan on every keystroke,
which gets slow past a few thousand documents. `$text` is index-backed and also gives
relevance scoring for free, which the API uses to sort matches by relevance when the
caller hasn't asked for a specific sort field. Trade-off worth noting: `$text` tokenizes
on word boundaries, so searching a full IP address like `192.168.1.45` matches best on
its numeric segments rather than as one exact string — acceptable for an investigative
search box, but worth knowing if exact IP lookup becomes a hard requirement (in which
case that field would move to an exact-match filter instead of full-text search).

**`severity` and `status` are Mongoose enums; `role`, `action`, `resourceType`, `region`
are plain strings.** The former drive the badge colors and filter dropdowns in the UI,
so an unexpected value would actually break something visible — rejecting bad data at
write time is the right call there. The latter are free-form because real audit sources
tend to introduce new roles or action types over time, and a fresher API deployment
shouldn't reject legitimate log ingestion just because it saw a `role` it didn't know about.

**`GET /api/logs/facets` returns distinct values from the actual collection**, rather
than the frontend hardcoding a list of roles/regions/etc. Filter dropdowns then always
reflect what's really in the database, including anything introduced by a bulk upload
after initial deployment.

**Filter changes reset pagination to page 1** on the frontend. Without this, narrowing
a search from "all logs" to "12 matching results" can strand the user on a now-empty
page 6.

**Search input is debounced (350ms)** client-side rather than firing a request on every
keystroke, to avoid hammering a server-side query across 10,000+ rows while someone is
still typing.

**Skip/limit pagination, not cursor-based.** Simpler to implement and reason about, and
fine at the data volumes this exercise specifies (10,000 records). It would start to
matter at very deep pages on much larger collections (`skip()` still has to walk past
the skipped documents) — a cursor/keyset approach (`_id`-based `after` tokens) would be
the next step if the dataset grew by orders of magnitude.

**`insertMany` is called on the raw `Log.collection`, bypassing Mongoose's per-document
validation/casting hooks**, and instead the client's `timestamp` strings are cast to
`Date` once, in bulk, before insert. This is a deliberate throughput choice for a
10,000-record batch; it does mean bulk-inserted documents skip Mongoose's own
`required`/`enum` checks and rely on MongoDB's native validation. For most audit
pipelines the ingestion source is trusted infrastructure, not arbitrary user input, so
this trade favors speed. If untrusted input becomes a real concern, the fix is to
validate the whole batch up front with a lightweight schema check (e.g. Zod/Joi) before
insert, rather than reintroducing document-by-document Mongoose validation.

**No frontend framework beyond React + Vite** (no Redux/React Query). The app has a
single page and one shape of server state (the current filtered/sorted/paginated log
list), so a couple of `useState`/`useEffect` hooks are enough; adding a state library or
data-fetching cache would be complexity the app doesn't need yet.

**Design direction:** a dark, data-dense layout modeled on how security tooling (SIEM
dashboards, terminal-adjacent tools) actually looks, rather than a generic light SaaS
admin theme — monospace type for actual log data (timestamps, actors, IPs, actions) so
rows read like real log output, a paired display face for structural chrome, and
severity encoded as both color and a dot marker (not color alone).

---

## 4. Deployment

Any Node host works for the API (Render, Railway, Fly.io) and any static host works for
the built frontend (Vercel, Netlify, Render static site). Rough outline:

1. **Database:** create a free MongoDB Atlas cluster, allow network access from
   anywhere (or the specific host's IPs), get the connection string.
2. **Backend:** deploy `server/` as a Node web service. Set `MONGODB_URI` and
   `CLIENT_ORIGIN` (your deployed frontend URL) as environment variables. Start command:
   `npm start`.
3. **Frontend:** deploy `client/` as a static site. Set `VITE_API_BASE_URL` to your
   deployed backend's URL + `/api`. Build command: `npm run build`, output dir: `dist`.
4. Update `CLIENT_ORIGIN` on the backend once you know the frontend's final URL, so CORS
   allows it.

---

## 5. What's not included (and why)

- **Auth** — out of scope for the exercise as written; in a real deployment every
  endpoint here (especially `bulk`) would sit behind authentication and role checks.
- **Rate limiting** on the bulk endpoint — worth adding before this is public-facing.
- **Automated tests** — omitted for time; the natural next additions would be a
  supertest suite against `buildFilter()`'s query construction (it's the piece most
  worth locking down against regressions) and a component test for `LogTable` sorting.

## Technical Decisions

- React + Vite: Fast development experience and efficient frontend build.
- Express.js: Lightweight REST API framework for Node.js.
- MongoDB (Mongoose): Flexible NoSQL database suitable for audit log data.
- Axios: Handles communication between the React frontend and Express backend.
- Render: Hosts the backend API.
- Vercel: Hosts the frontend application.