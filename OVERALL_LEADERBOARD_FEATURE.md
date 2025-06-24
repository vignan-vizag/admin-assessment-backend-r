# Overall Leaderboard Feature

## Overview
The Overall Leaderboard feature provides a comprehensive ranking system that aggregates students from all graduation year collections and displays the top 25 students with the highest total marks across the entire institution.

## Features
- **Cross-Year Analysis**: Aggregates students from all available year collections (e.g., 2023_students, 2024_students, 2025_students, etc.)
- **Top 25 Students**: Returns the highest scoring 25 students across all years
- **Comprehensive Data**: Includes student details, scores, year information, and category breakdowns
- **Performance Optimized**: Uses the pre-calculated `totalmarks` field for fast queries

## API Endpoint

### GET `/api/admin/overall-leaderboard/:year`

**Description**: Gets the top 25 students with highest total marks across all graduation year collections.

**Parameters**:
- `year` (path parameter): The graduation year context (required for API consistency, but returns data from all years)

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
  "totalStudentsEvaluated": 250,
  "studentsFromYears": [2023, 2024, 2025, 2026],
  "totalCollectionsProcessed": 7,
  "categories": ["Coding", "Aptitude", "Reasoning", "Verbal"],
  "message": "Top 25 students overall leaderboard across all graduation years"
}
```

### Response Fields

- `graduationYear`: The year parameter passed in the request
- `overallLeaderboard`: Array of top 25 students with their rankings
  - `rank`: Position in the overall leaderboard (1-25)
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
- `totalStudentsEvaluated`: Total number of students with scores across all years
- `studentsFromYears`: Array of graduation years found in the data
- `totalCollectionsProcessed`: Number of student collections examined
- `categories`: Available test categories
- `message`: Descriptive message about the response

## How It Works

1. **Collection Discovery**: Automatically finds all student collections ending with '_students'
2. **Year Parsing**: Extracts graduation year from collection names (e.g., '2026_students' → 2026)
3. **Data Aggregation**: Queries each collection for students with completed tests
4. **Score Calculation**: Uses the optimized `totalmarks` field for performance
5. **Global Ranking**: Sorts all students across all years by total score
6. **Top 25 Selection**: Returns the highest scoring 25 students

## Use Cases

1. **Institution-wide Excellence Recognition**: Identify top performers across all batches
2. **Inter-batch Comparison**: Compare performance across different graduation years
3. **Academic Analytics**: Analyze overall institutional performance trends
4. **Scholarship/Award Selection**: Merit-based selections across all students

## Technical Notes

- **Performance**: Optimized using pre-calculated `totalmarks` field
- **Error Handling**: Continues processing even if individual collections fail
- **Filtering**: Only includes students with totalmarks > 0
- **Scalability**: Efficiently handles multiple year collections
- **Consistency**: Uses the same calculation logic as individual year leaderboards

## CURL Command Example

```bash
# 1. First, get admin authentication token
curl -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "principal-viit",
    "password": "principal-viit"
  }'

# 2. Use the token to get overall leaderboard
curl -X GET "http://localhost:4000/api/admin/overall-leaderboard/2026" \
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

### 401 - Unauthorized
```json
{
  "message": "Access denied. No token provided."
}
```

### 404 - No Data Found
```json
{
  "message": "No student collections found"
}
```

```json
{
  "message": "No students found with completed tests across all years"
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
| **Scope** | Single graduation year | All graduation years |
| **Endpoint** | `/api/admin/leaderboard/:year` | `/api/admin/overall-leaderboard/:year` |
| **Data Source** | One collection (e.g., 2026_students) | All student collections |
| **Use Case** | Year-wise performance analysis | Institution-wide excellence |
| **Response** | Students from specified year only | Top performers across all years |

## Benefits

1. **Comprehensive View**: See the best students across the entire institution
2. **Fair Comparison**: Merit-based ranking regardless of graduation year
3. **Efficient Processing**: Leverages optimized database fields
4. **Flexible Analysis**: Provides both overall scores and category breakdowns
5. **Scalable Design**: Automatically adapts to new year collections
