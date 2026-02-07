# TODO: Fix Cron Job That Missed 6pm Run

**Created:** Feb 5, 2026 6:21 PM CST
**Issue:** `hourly-pm-checkin` cron job (ID: c5aaca49-0e63-4535-8ddc-08d5e7df3d9d) did NOT auto-run at 6:00 PM CST despite being created at 5:09 PM

---

## Investigation Tasks

- [ ] Check cron job status with `openclaw cron list`
- [ ] Verify `nextRunAtMs` timestamp is correct
- [ ] Check if gateway was awake/running at 6pm
- [ ] Review any error logs from the missed run
- [ ] Compare with working cron jobs (openclaw-health-hourly runs every hour)
- [ ] Test by manually triggering the job

---

## Root Cause Found ✅

**The cron job is set for 7 PM CST, not 6 PM!**

- Job created: 5:09 PM CST
- `nextRunAtMs`: 1770339600000 = **7:00 PM CST** (00:00 UTC)
- Schedule `0 * * * *` runs at top of hour
- Since created AFTER 5:00 PM, next run is 7:00 PM (6 PM UTC)

**Not a bug** — just timing confusion. The job will run at 7 PM.

## Remaining Questions
- [ ] Verify the job actually runs at 7 PM
- [ ] Check if we want hourly jobs to run immediately if created mid-hour

---

## Action Required

**Do not just create ANOTHER cron.** First understand why this one failed, then fix the underlying issue.

**Reference:** 
- Working example: `openclaw-health-hourly` (74bc5d1e-5b36-413c-afbf-006caab17c52) runs every hour successfully
- Broken job: `hourly-pm-checkin` (c5aaca49-0e63-4535-8ddc-08d5e7df3d9d)

---

**Status:** INVESTIGATING
**Priority:** HIGH — hourly check-ins are critical
