# Admin Authentication CURL Commands

This document contains CURL commands to test the admin authentication system.

## Prerequisites
- Server should be running on `http://localhost:3000` (adjust port if different)
- The default admin accounts should be created automatically when the server starts

## Default Admin Accounts
1. **Principal Account**
   - Username: `principal-viit`
   - Password: `principal-viit`
   - Role: `principal`

2. **CSE HOD Account**
   - Username: `csehod-viit`
   - Password: `csehod-viit`
   - Role: `hod`

## 1. Admin Login

### Login as Principal
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "principal-viit",
    "password": "principal-viit"
  }'
```

### Login as CSE HOD
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "csehod-viit",
    "password": "csehod-viit"
  }'
```

### Expected Response (Success)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "60f7b8b8b8b8b8b8b8b8b8b8",
    "username": "principal-viit",
    "role": "principal"
  },
  "message": "Admin login successful"
}
```

### Expected Response (Failed Login)
```json
{
  "message": "Invalid credentials"
}
```

## 2. Get Admin Profile

**Note:** Replace `YOUR_ADMIN_TOKEN` with the actual token received from login

```bash
curl -X GET http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Expected Response
```json
{
  "admin": {
    "_id": "60f7b8b8b8b8b8b8b8b8b8b8",
    "username": "principal-viit",
    "role": "principal",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## 3. Testing Protected Routes (Examples)

### Access Protected Exam Routes (if implemented)
```bash
# Get all exams (admin only)
curl -X GET http://localhost:3000/api/exams \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Create new exam (admin only)
curl -X POST http://localhost:3000/api/exams \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sample Exam",
    "description": "This is a test exam",
    "duration": 60,
    "totalMarks": 100
  }'
```

## 4. Overall Leaderboard (Specific Year) with Filters

### Get Top 25 Students for Graduation Year 2026
```bash
curl -X GET "http://localhost:4000/api/admin/overall-leaderboard/2026" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Get Top 10 CSE Students from 2026
```bash
curl -X GET "http://localhost:4000/api/admin/overall-leaderboard/2026?branch=CSE&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Get Top 15 Students from CSE Section 1 in 2026
```bash
curl -X GET "http://localhost:4000/api/admin/overall-leaderboard/2026?branch=CSE&section=1&limit=15" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Get Top 5 Students from 2025 Graduation Year
```bash
curl -X GET "http://localhost:4000/api/admin/overall-leaderboard/2025?limit=5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Expected Response (Success)
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
    "limit": 15
  },
  "totalStudentsEvaluated": 25,
  "totalStudentsInYear": 150,
  "categories": ["Coding", "Aptitude", "Reasoning", "Verbal"],
  "message": "Top 15 students overall leaderboard for graduation year 2026 (Branch: CSE, Section: 1)"
}
```

### Available Filter Parameters
- `branch`: Filter by academic branch (e.g., CSE, ECE, MECH)
- `section`: Filter by section (requires branch parameter)  
- `limit`: Number of top students to return (1-100, default: 25)

### Key Features
- **Year-Specific Analysis**: Gets top students from the specified graduation year only
- **Advanced Filtering**: Filter by branch, section, and result limit
- **Overall Performance Ranking**: Best N students within the specified year
- **Comprehensive Data**: Includes year, branch, section, and category breakdowns
- **Performance Optimized**: Uses pre-calculated totalmarks field
- **Filter Summary**: Shows which filters were applied in the response

## Important Notes

1. **Token Expiration**: Admin tokens expire in 8 hours
2. **Case Sensitivity**: Usernames and passwords are case-sensitive
3. **Content-Type**: Always include `Content-Type: application/json` for POST requests
4. **Authorization Header**: Use `Bearer TOKEN` format for authenticated requests
5. **Server Status**: Ensure your server is running before testing

## Troubleshooting

- **Connection Refused**: Check if server is running on the correct port
- **404 Not Found**: Verify the route endpoints are correct
- **500 Internal Server Error**: Check server logs for detailed error messages
- **Invalid Token**: Token might be expired or malformed
