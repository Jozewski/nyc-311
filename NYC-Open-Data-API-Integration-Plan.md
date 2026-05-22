# NYC Open Data API Integration Plan

## Overview
Integrate NYC Open Data portal into the existing NYC 311 dashboard using a **hybrid caching approach**: periodically fetch data from the NYC Open Data API and cache it in the local SQLite database for fast queries.

## User Requirements
- ✅ Hybrid approach: Cache API data in SQLite periodically
- ✅ Use unauthenticated access (no API token required)
- ✅ Query all available data (2020-present), not just 2023

## Current State
- **Database**: SQLite at `nyc_311_2023.db` (9.6 MB, read-only)
- **Data**: ~25,000 rows of 2023 service requests
- **Schema**: `service_requests` table with fields: borough, complaint_type, agency, agency_name, created_date, created_month, resolution_hours
- **Routes**: 5 API routes querying this data (all continue to work as-is)

## NYC Open Data API
- **Endpoint**: `https://data.cityofnewyork.us/resource/erm2-nwe9.json`
- **Platform**: Socrata SODA API (supports SoQL queries)
- **Data Volume**: Millions of records from 2020-present
- **Rate Limits**: ~1000 requests/day for unauthenticated access
- **Max Records/Request**: 50,000

---

## Implementation Strategy

### Architecture
Create a **data sync system** with 4 new script files:

1. **apiClient.js** - Fetch data from NYC Open Data API with pagination & rate limiting
2. **dataTransformer.js** - Map API fields to database schema, calculate derived fields
3. **dbManager.js** - Handle batch inserts, upserts, and sync metadata tracking
4. **syncData.js** - Main CLI orchestrator for full/incremental syncs

### Database Changes

**Keep existing schema** (all routes continue to work without modification)

**Add new elements:**
```sql
-- Metadata table to track sync operations
CREATE TABLE sync_metadata (
    id INTEGER PRIMARY KEY,
    sync_type TEXT,           -- 'full' or 'incremental'
    started_at TEXT,
    completed_at TEXT,
    status TEXT,              -- 'in_progress', 'completed', 'failed'
    records_fetched INTEGER,
    records_inserted INTEGER,
    last_record_date TEXT,    -- Latest created_date synced
    error_message TEXT
);

-- Performance indexes (for millions of records)
CREATE INDEX idx_borough ON service_requests(borough);
CREATE INDEX idx_complaint_type ON service_requests(complaint_type);
CREATE INDEX idx_created_date ON service_requests(created_date);
CREATE INDEX idx_created_month ON service_requests(created_month);
```

**Modify db.js**: Add write mode support while maintaining backward compatibility

### Data Flow

```
NYC Open Data API
    ↓ (fetch in 50K batches with 1s delays)
apiClient.js
    ↓ (paginate, rate limit, retry on errors)
dataTransformer.js
    ↓ (map fields, calculate resolution_hours, created_month, etc.)
dbManager.js
    ↓ (batch insert in transactions, upsert on conflict)
SQLite Database (nyc_311_data.db)
    ↓ (existing routes query this database)
Dashboard UI
```

### Field Mapping

**Direct mappings:** unique_key, created_date, closed_date, agency, agency_name, complaint_type, descriptor, borough, status, incident_zip

**Calculated fields:**
- `resolution_hours` = hours between created_date and closed_date
- `created_month` = extract month (1-12) from created_date
- `created_hour` = extract hour (0-23) from created_date
- `created_day_of_week` = day name from created_date

### Sync Modes

**Full Sync:**
```bash
npm run sync:full
```
- Fetches all data from 2020-present
- Splits into yearly batches (2020, 2021, 2022, etc.)
- Uses `$where=created_date >= '2023-01-01' AND created_date < '2024-01-01'`
- Estimated time: 30-60 minutes for ~5M records
- Database size: ~1-2 GB

**Incremental Sync:**
```bash
npm run sync:incremental
```
- Fetches only records created since last successful sync
- Uses date from `sync_metadata.last_record_date`
- Estimated time: 30 seconds - 2 minutes for ~10K new records/day

### Pagination Strategy

```javascript
// Fetch in 50,000-record batches (Socrata max)
const BATCH_SIZE = 50000;
let offset = 0;

while (hasMore) {
  const url = `${baseUrl}?$limit=${BATCH_SIZE}&$offset=${offset}&$order=created_date ASC`;
  const batch = await fetchWithRetry(url);

  await transformAndInsert(batch);

  offset += BATCH_SIZE;
  await sleep(1000); // Rate limiting: 1 second between requests
}
```

### Error Handling

- **API errors**: Retry 3 times with exponential backoff
- **Database errors**: Use transactions, rollback on failure
- **Data validation**: Skip invalid records, log errors
- **Rate limiting**: Detect HTTP 429, increase delay
- **Checkpoint recovery**: Save progress after each batch

---

## Implementation Steps

### Phase 1: Foundation
1. Create `config/sync.config.js` with API and database settings
2. Modify `db.js` to support write mode (remove readonly for sync operations)
3. Create migration script for `sync_metadata` table and indexes

### Phase 2: Core Scripts
4. Build `scripts/apiClient.js` - API wrapper with pagination & rate limiting
5. Build `scripts/dataTransformer.js` - field mapping & calculations
6. Build `scripts/dbManager.js` - batch inserts, upserts, metadata tracking
7. Build `scripts/syncData.js` - CLI orchestrator

### Phase 3: Testing
8. Test with limited data (1 month of 2023) - verify transformations
9. Test incremental sync - verify only new records fetched
10. Test error recovery - disconnect network mid-sync

### Phase 4: Initial Sync
11. Run full sync for 2020-present (~30-60 minutes)
12. Verify data integrity (row counts, date ranges, borough distribution)
13. Update `db.js` to use new database by default
14. Test all existing routes with new data

### Phase 5: Automation
15. Add npm scripts for sync commands
16. Set up scheduled incremental syncs (Windows Task Scheduler or cron)
17. Add optional `/api/sync-status` endpoint to show sync health

---

## Critical Files

### Files to Create
1. `C:\Users\joann\Desktop\nyc-311\scripts\apiClient.js` - NYC Open Data API client
2. `C:\Users\joann\Desktop\nyc-311\scripts\dataTransformer.js` - Data mapping logic
3. `C:\Users\joann\Desktop\nyc-311\scripts\dbManager.js` - Database operations
4. `C:\Users\joann\Desktop\nyc-311\scripts\syncData.js` - Main sync CLI
5. `C:\Users\joann\Desktop\nyc-311\config\sync.config.js` - Configuration

### Files to Modify
1. `C:\Users\joann\Desktop\nyc-311\db.js` - Add write mode support
2. `C:\Users\joann\Desktop\nyc-311\package.json` - Add dependencies and scripts

### Dependencies to Add
```json
{
  "dependencies": {
    "node-fetch": "^2.7.0",
    "p-limit": "^3.1.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "winston": "^3.11.0"
  }
}
```

---

## Testing & Verification

### After Initial Implementation
1. Run test sync with limited date range:
   ```bash
   node scripts/syncData.js --mode=full --from=2023-01-01 --to=2023-01-31
   ```
2. Verify database has records:
   ```bash
   sqlite3 nyc_311_data.db "SELECT COUNT(*) FROM service_requests"
   ```

### After Full Sync
3. Check borough distribution matches expected NYC data
4. Verify all 5 routes return data correctly
5. Compare dashboard visualizations with known 311 patterns
6. Test incremental sync adds only new records
7. Monitor sync logs for errors

### Performance Checks
8. Query response times should be similar to current setup
9. Database size should be 1-2 GB for ~5M records
10. Full sync completes in under 1 hour

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Rate limiting blocks | 1s delays between requests, retry logic, consider getting free app token |
| Large dataset crashes | Batch processing (50K fetch, 1K insert), date-range splitting by year |
| Long sync times | Progress reporting, background processing, use incremental mode daily |
| Database locking | Use WAL mode, schedule syncs during low traffic periods |
| Missing API fields | Default values, null handling, data validation |

---

## Future Enhancements

1. **Get Socrata App Token**: Free registration increases rate limits significantly (1000 requests/rolling period vs shared pool)
2. **Sync Status Dashboard**: Add `/api/sync-status` endpoint showing last sync time, record count, date coverage
3. **Automated Scheduling**: Set up Windows Task Scheduler for daily incremental syncs
4. **Data Archival**: Define retention policy (all-time vs. rolling 3-year window)
5. **Database Backup**: Automated backups before each full sync

---

## Estimated Timeline

- **Phase 1-2 (Core Implementation)**: 4-6 hours
- **Phase 3 (Testing)**: 2-3 hours
- **Phase 4 (Initial Sync & Integration)**: 2-3 hours (including 1 hour for full sync)
- **Phase 5 (Automation)**: 1-2 hours

**Total**: 9-14 hours of development + 1 hour for initial data sync

---

## Success Criteria

✅ Full sync successfully populates database with 2020-present data
✅ All existing routes work without modification
✅ Dashboard displays updated data correctly
✅ Incremental sync adds only new records efficiently
✅ Sync operations complete without errors
✅ Database queries remain fast (<100ms for typical queries)
✅ Sync logs show progress and any errors clearly
