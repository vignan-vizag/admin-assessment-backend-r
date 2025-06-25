# Dynamic Exam Offline Scheduler with Absent Student Marking

## Overview
This system automatically sets live exams to offline status exactly 3.5 hours after they are set to live and marks students who never started the exam as absent with -1 marks. Each exam gets its own individual timer for precise timing.

## How It Works

### 1. Dynamic Individual Timers
- **Immediate Scheduling**: When an exam is set to live, a timer is immediately created for exactly 3.5 hours
- **Precise Timing**: Each exam has its own countdown timer, not dependent on periodic checks
- **Automatic Cleanup**: Timers are automatically removed when exams go offline (manually or automatically)
- **Server Restart Recovery**: On server restart, any live exams are rescheduled based on their original live timestamp

### 2. Enhanced Student Status Flow
- **pending**: Student assigned to test but hasn't started
- **writing**: Student has started the test (changed from 'in-progress')
- **completed**: Student has submitted the test
- **absent**: Automatically set when exam goes offline and student status was still 'pending'

### 3. Enhanced Exam Model
- Added `examLiveTimestamp` field to track when an exam was set to live
- This timestamp is automatically set when `examLive` is set to `true`
- The timestamp is cleared when `examLive` is set to `false`

### 4. Intelligent Scheduling System
- **Live Event Trigger**: Timer created instantly when exam is set to live
- **Offline Event Trigger**: Timer cancelled when exam is manually set to offline
- **Memory Management**: Active timers stored in memory with automatic cleanup
- **Crash Recovery**: Reschedules timers for live exams on server restart

### 5. Absent Student Processing
When an exam goes offline after exactly 3.5 hours:
1. Finds all students across all year collections who have the test assigned
2. Identifies students whose test status is still 'pending' (never started)
3. Marks these students as:
   - Status: 'completed'
   - Marks: `{ absent: -1 }`
   - SubmittedAt: Current timestamp
4. Logs detailed information about absent students
5. Sets exam to offline and clears timestamp

## Status Flow Examples

### Normal Flow
```
pending → (student starts test) → writing → (student submits) → completed
```

### Absent Student Flow
```
pending → (exam expires after exactly 3.5h) → completed (with absent: -1 marks)
```

### Students Writing When Exam Expires
```
pending → writing → (exam expires) → writing (continues until manual submit)
```

## API Endpoints

### Existing Endpoints (enhanced behavior)
- `POST /api/exams/toggle-exam` - Start/stop exam (now creates/cancels individual timers)
- `GET /api/exams/live` - Get live exams
- `POST /api/tests/:testId/start` - Student starts test (now sets status to 'writing')

### New Monitoring Endpoints
- `GET /api/exams/live-with-time` - Get live exams with remaining time info
- `GET /api/exams/active-timers` - Get active timer information (Admin only)

### Active Timers Endpoint Response
```json
{
  "activeExamsCount": 2,
  "activeExamIds": ["64f7b123...", "64f7b456..."],
  "liveExams": [
    {
      "_id": "64f7b123...",
      "testName": "Math Test",
      "examLiveTimestamp": "2025-06-25T02:00:00.000Z",
      "elapsedMinutes": 45,
      "remainingMinutes": 165,
      "willGoOfflineAt": "2025-06-25T05:30:00.000Z"
    }
  ]
}
```

## Configuration

### Timing
- **Auto-offline time**: Exactly 3.5 hours (210 minutes) from live timestamp
- **Precision**: Down to the second (uses setTimeout)
- **Recovery**: Reschedules on server restart based on original timestamp

### Absent Marks Value
- **Default absent marks**: -1
- **Location**: `services/examScheduler.js` in `markAbsentStudents` function

### Customization
To change the auto-offline time, modify the value in `services/examScheduler.js`:
```javascript
const offlineTime = new Date(liveTimestamp.getTime() + (3.5 * 60 * 60 * 1000)); // Change 3.5 to desired hours
```

To change absent marks value:
```javascript
'assignedTests.$.marks': { absent: -1 }, // Change -1 to desired value
```

## Enhanced Logs

### Timer Creation Logs
```
[Exam Scheduler] Exam "Math Test" scheduled to go offline in 3h 30m 0s at 2025-06-25T05:30:00.000Z
```

### Timer Cancellation Logs
```
[Exam Scheduler] Cancelled scheduled offline for exam: Math Test
```

### Automatic Offline Logs
```
[2025-06-25T05:30:00.000Z] Setting exam "Math Test" to offline after 3.5 hours
  - Marked 3 students as absent in 2024_students
    - Student CS001 (John Doe) marked absent
    - Student CS002 (Jane Smith) marked absent
  - Total students marked absent for Math Test: 3
[2025-06-25T05:30:00.000Z] Exam "Math Test" successfully set to offline and absent students processed
```

### Server Restart Recovery Logs
```
[Exam Scheduler] Found 2 live exam(s) on startup, rescheduling timers...
[Exam Scheduler] Exam "Math Test" scheduled to go offline in 2h 15m 30s at 2025-06-25T05:30:00.000Z
[Exam Scheduler] Exam "Science Quiz" should already be offline, setting offline immediately
```

## Advanced Features

### Memory Management
- Active timers stored in `Map` structure for O(1) lookup
- Automatic cleanup when timers fire or are cancelled
- No memory leaks from orphaned timers

### Server Restart Handling
- Automatically detects live exams on startup
- Recalculates remaining time based on original live timestamp
- Immediately processes overdue exams
- Reschedules future exams

### Concurrent Exam Support
- Multiple exams can be live simultaneously
- Each exam has independent 3.5-hour countdown
- No interference between different exam timers

### Error Handling
- Graceful handling of database connection issues
- Automatic retry for failed operations
- Detailed error logging with context

## Important Notes

### Precision vs Previous System
- **Old System**: Checked every 15 minutes (up to 15-minute delay)
- **New System**: Exact timing down to the second
- **Advantage**: Exams go offline at exactly 3.5 hours, not 3.5-3.75 hours

### Student Status Handling
- Students with 'writing' status when exam expires are NOT marked absent
- Only students with 'pending' status are marked absent
- This ensures students who started but didn't finish are not penalized as absent

### Cross-Year Support
- The system checks all year-based student collections automatically
- Works across multiple graduation years (2024_students, 2025_students, etc.)

### No Breaking Changes
- All existing functionality remains the same
- Existing API calls work without modification
- Database structure is backward compatible
- Enhanced precision and reliability

## Dependencies
- `node-cron`: Still included but not used (can be removed if desired)
- `mongoose`: For database operations across multiple collections
- Native `setTimeout`: For precise individual exam timers
