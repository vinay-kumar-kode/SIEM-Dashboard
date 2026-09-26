// ======================================
// Sentinel SIEM - Pagination Helper
// utils/paginate.js
// ======================================
//
// Shared by the three list endpoints (logs, alerts, incidents). They all
// take the same query parameters and answer with the same envelope, so the
// parsing lives here once instead of being copied into each controller.

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

// Reads ?page and ?limit off the query. Values arrive as strings, so they
// are coerced and clamped here: a negative page would ask Mongo for a
// negative skip, and an unbounded limit would let one request pull the
// entire collection into memory.
const parsePaging = (query) => {

    const rawPage = parseInt(query.page, 10);
    const rawLimit = parseInt(query.limit, 10);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

    const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    return { page, limit, skip: (page - 1) * limit };

};

// Sorts on an allow-list rather than trusting ?sort. The column names are
// interpolated into the query, so a free-form value would be a NoSQL
// injection point; anything not listed falls back to newest-first.
const SORTABLE = {
    timestamp: "timestamp",
    severity: "severity",
    status: "status",
    source: "source",
    eventType: "eventType",
    sourceIp: "sourceIp",
    attackType: "attackType",
    priority: "priority",
    incidentId: "incidentId"
};

const parseSort = (raw) => {

    const fallback = { timestamp: -1 };

    if (typeof raw !== "string" || !raw) {
        return fallback;
    }

    const descending = raw.startsWith("-");

    const field = descending ? raw.slice(1) : raw;

    if (!SORTABLE[field]) {
        return fallback;
    }

    return { [SORTABLE[field]]: descending ? -1 : 1 };

};

// Builds the response envelope. `total` is the count of everything matching
// the filter, not the size of this page, so the frontend can work out how
// many pages there are.
const paginated = (docs, total, { page, limit }) => {

    return {
        success: true,
        count: total,
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
        data: docs
    };

};

module.exports = { parsePaging, parseSort, paginated, DEFAULT_LIMIT, MAX_LIMIT };
