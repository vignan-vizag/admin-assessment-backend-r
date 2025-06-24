# Overall Leaderboard Feature

## Overview
The Overall Leaderboard feature provides a comprehensive ranking system that displays the top students with the highest total marks for a specific graduation year. This gives an overall performance view across all tests for students within that particular year.

## Features
- **Year-Specific Analysis**: Shows top students from a specific graduation year
- **Overall Performance Ranking**: Ranks students based on their total marks across all completed tests
- **Advanced Filtering**: Filter by branch, section, and result limit
- **Comprehensive Data**: Includes student details, scores, and category breakdowns
- **Performance Optimized**: Uses the pre-calculated `totalmarks` field for fast queries

## API Endpoint

### GET `/api/admin/overall-leaderboard/:year`

**Description**: Gets the top students with highest total marks for a specific graduation year with optional filtering capabilities.

**Parameters**:
- `year` (path parameter): The graduation year to get leaderboard for (required)

**Query Parameters (Optional)**:
- `branch` (string): Filter students by academic branch (e.g., "CSE", "ECE", "MECH")
- `section` (string): Filter students by section (requires branch parameter)
- `limit` (number): Number of top students to return (1-100, default: 25)

**Headers**:
- `Authorization: Bearer <admin_token>` (required)
- `Content-Type: application/json`

**Authentication**: Requires admin authentication

### Response Format

```json
{
  "graduationYear": "2026",
  "overallLeaderboard": [
    {
      "rank": 1,
      "studentId": "684dbfccf55e6059192b28f2",
      "name": "Student Name",
      "rollno": "22L31A0562",
      "branch": "CSE",
      "section": "1",
      "year": 2026,
      "totalScore": 150,
      "totalTests": 5,
      "averageScore": "30.00",
      "categoryBreakdown": {
        "coding": 40,
        "aptitude": 35,
        "reasoning": 45,
        "verbal": 30
      }
    }
  ],
  "appliedFilters": {
    "graduationYear": "2026",
    "branch": "CSE",
    "section": "1",
    "limit": 25
  },
  "totalStudentsEvaluated": 25,
  "totalStudentsInYear": 150,
  "categories": ["Coding", "Aptitude", "Reasoning", "Verbal"],
  "message": "Top 25 students overall leaderboard for graduation year 2026 (Branch: CSE, Section: 1)"
}
```

### Response Fields

- `graduationYear`: The year parameter passed in the request
- `overallLeaderboard`: Array of top N students with their rankings
  - `rank`: Position in the overall leaderboard (1-N)
  - `studentId`: Unique student identifier
  - `name`: Student's full name
  - `rollno`: Student's roll number
  - `branch`: Academic branch (e.g., CSE, ECE, MECH)
  - `section`: Class section
  - `year`: Graduation year of the student
  - `totalScore`: Total marks scored across all completed tests
  - `totalTests`: Number of tests completed
  - `averageScore`: Average score per test
  - `categoryBreakdown`: Detailed scores by category
- `appliedFilters`: Object showing the filters applied to the query
  - `graduationYear`: The graduation year being analyzed
  - `branch`: Branch filter applied or "All branches"
  - `section`: Section filter applied or "All sections" 
  - `limit`: Number of results returned
- `totalStudentsEvaluated`: Total number of students with scores matching filters
- `totalStudentsInYear`: Total number of students in the graduation year
- `categories`: Available test categories
- `message`: Descriptive message about the response including applied filters

## How It Works

1. **Year Selection**: Uses the specified graduation year from the URL parameter
2. **Data Query**: Queries the specific year's student collection for students with completed tests
3. **Filtering**: Applies optional branch and section filters
4. **Score Calculation**: Uses the optimized `totalmarks` field for performance
5. **Ranking**: Sorts students by total score in descending order
6. **Top N Selection**: Returns the highest scoring N students (default: 25)

## Use Cases

1. **Year-wise Excellence Recognition**: Identify top performers within a specific graduation year
2. **Branch-wise Analysis**: Compare performance within departments
3. **Section-wise Ranking**: Analyze performance at section level
4. **Merit-based Selections**: Rank students for awards, scholarships within a year

## Technical Notes

- **Performance**: Optimized using pre-calculated `totalmarks` field
- **Error Handling**: Continues processing even if individual collections fail
- **Filtering**: Only includes students with totalmarks > 0
- **Scalability**: Efficiently handles multiple year collections
- **Consistency**: Uses the same calculation logic as individual year leaderboards

## CURL Command Examples

```bash
# 1. First, get admin authentication token
curl -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "principal-viit",
    "password": "principal-viit"
  }'

# 2. Get overall leaderboard for 2026 (all students, all branches, top 25)
curl -X GET "http://localhost:4000/api/admin/overall-leaderboard/2026" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json"

# 3. Get top 10 CSE students from 2026
curl -X GET "http://localhost:4000/api/admin/overall-leaderboard/2026?branch=CSE&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json"

# 4. Get top 15 students from CSE Section 1 in 2026
curl -X GET "http://localhost:4000/api/admin/overall-leaderboard/2026?branch=CSE&section=1&limit=15" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json"

# 5. Get top 5 students from 2025 graduation year
curl -X GET "http://localhost:4000/api/admin/overall-leaderboard/2025?limit=5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json"

# 6. Get top 20 ECE students from 2024
curl -X GET "http://localhost:4000/api/admin/overall-leaderboard/2024?branch=ECE&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

## Error Responses

### 400 - Bad Request
```json
{
  "message": "Graduation year parameter is required"
}
```

```json
{
  "message": "Limit must be between 1 and 100"
}
```

```json
{
  "message": "Branch filter is required when using section filter"
}
```

### 401 - Unauthorized
```json
{
  "message": "Access denied. No token provided."
}
```

### 200 - No Data Found (Returns Success with Empty Results)
```json
{
  "graduationYear": "2025",
  "overallLeaderboard": [],
  "appliedFilters": {
    "graduationYear": "2025",
    "branch": "All branches",
    "section": "All sections",
    "limit": 25
  },
  "totalStudentsEvaluated": 0,
  "totalStudentsInYear": 0,
  "categories": ["Coding", "Aptitude", "Reasoning", "Verbal"],
  "message": "No students found with completed tests for year 2025"
}
```

```json
{
  "graduationYear": "2026",
  "overallLeaderboard": [],
  "appliedFilters": {
    "graduationYear": "2026",
    "branch": "CSE",
    "section": "All sections", 
    "limit": 25
  },
  "totalStudentsEvaluated": 0,
  "totalStudentsInYear": 5,
  "categories": ["Coding", "Aptitude", "Reasoning", "Verbal"],
  "message": "No students found with scores > 0 for year 2026 in branch CSE"
}
```

### 500 - Server Error
```json
{
  "message": "Failed to get overall leaderboard",
  "error": "Detailed error message"
}
```

## Difference from Year-Specific Leaderboard

| Feature | Year-Specific Leaderboard | Overall Leaderboard |
|---------|---------------------------|---------------------|
| **Scope** | Single graduation year | Single graduation year with overall performance |
| **Endpoint** | `/api/admin/leaderboard/:year` | `/api/admin/overall-leaderboard/:year` |
| **Data Source** | One collection (e.g., 2026_students) | One collection (e.g., 2026_students) |
| **Use Case** | Year-wise performance analysis | Overall ranking within a specific year |
| **Response** | Students from specified year only | Top performers from specified year with detailed scoring |

## Benefits

1. **Focused Analysis**: See the best students within a specific graduation year
2. **Fair Comparison**: Merit-based ranking within the same academic cohort
3. **Efficient Processing**: Leverages optimized database fields
4. **Flexible Filtering**: Provides filtering by branch and section
5. **Detailed Insights**: Category-wise breakdown and comprehensive student data
