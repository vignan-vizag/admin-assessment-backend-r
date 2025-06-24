# Authentication Testing Guide

## Overview
This guide helps you test the authentication system with the improved token persistence and validation features.

## Issues Fixed
1. ✅ **Extended Token Expiration**: Student tokens now last 8 hours (same as admin)
2. ✅ **Better Error Messages**: Detailed error information for debugging
3. ✅ **Token Validation Endpoints**: Check if tokens are still valid
4. ✅ **Token Type Checking**: Proper separation between student and admin tokens

## Testing Authentication

### 1. Student Authentication

#### Student Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "rollno": "your_rollno",
    "password": "your_password",
    "year": 2026
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "student": { "id": "...", "name": "...", "rollno": "..." }
}
```

#### Validate Student Token
```bash
curl -X GET http://localhost:3000/api/auth/validate \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
```

**Response (Valid Token):**
```json
{
  "valid": true,
  "student": {
    "id": "...",
    "rollno": "...",
    "name": "...",
    "year": 2026,
    "branch": "...",
    "section": "...",
    "totalmarks": 0
  },
  "message": "Token is valid"
}
```

**Response (Expired Token):**
```json
{
  "message": "Token expired",
  "error": "Please login again",
  "expired": true
}
```

#### Test Student Protected Route
```bash
curl -X GET http://localhost:3000/api/student/dashboard \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
```

### 2. Admin Authentication

#### Admin Login
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "principal-viit",
    "password": "principal-viit"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "...",
    "username": "principal-viit",
    "role": "principal"
  },
  "message": "Admin login successful"
}
```

#### Validate Admin Token
```bash
curl -X GET http://localhost:3000/api/admin/validate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response (Valid Token):**
```json
{
  "valid": true,
  "admin": {
    "id": "...",
    "username": "principal-viit",
    "role": "principal"
  },
  "message": "Admin token is valid"
}
```

#### Test Admin Protected Route
```bash
curl -X GET http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Token Persistence Testing

### Test Scenario 1: Long Session
1. Login as student/admin
2. Wait for a few hours (tokens now last 8 hours)
3. Try accessing protected routes
4. Should work without re-login

### Test Scenario 2: Token Validation
1. Login and get token
2. Use `/api/auth/validate` or `/api/admin/validate` periodically
3. Should return `valid: true` until expiration

### Test Scenario 3: Cross-Type Protection
1. Login as student, get student token
2. Try accessing admin routes with student token
3. Should get "Admin access required" error
4. Vice versa for admin token on student routes

## Error Types You Might See

### Authentication Errors
```json
{
  "message": "Authentication required",
  "error": "No token provided"
}
```

### Token Expiration
```json
{
  "message": "Token expired",
  "error": "Please login again",
  "expired": true
}
```

### Wrong Token Type
```json
{
  "message": "Admin access required",
  "error": "Invalid token type"
}
```

### Invalid Token
```json
{
  "message": "Invalid token",
  "error": "Token is malformed or invalid"
}
```

## Frontend Integration Tips

### Store Token Properly
```javascript
// After login
localStorage.setItem('authToken', response.data.token);
localStorage.setItem('userType', 'student'); // or 'admin'

// Use in requests
const token = localStorage.getItem('authToken');
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

### Check Token Validity
```javascript
const validateToken = async () => {
  try {
    const userType = localStorage.getItem('userType');
    const endpoint = userType === 'admin' ? '/api/admin/validate' : '/api/auth/validate';
    
    const response = await axios.get(endpoint);
    return response.data.valid;
  } catch (error) {
    if (error.response?.data?.expired) {
      // Token expired, redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('userType');
      window.location.href = '/login';
    }
    return false;
  }
};

// Check on page load/refresh
validateToken();
```

### Auto-refresh Check
```javascript
// Check token validity every 30 minutes
setInterval(validateToken, 30 * 60 * 1000);
```

## Testing with Postman

1. Create a new collection for authentication
2. Set up environment variables:
   - `baseUrl`: `http://localhost:3000`
   - `studentToken`: (set after login)
   - `adminToken`: (set after login)

3. In login requests, add a test script to save the token:
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("studentToken", jsonData.token);
}
```

4. In protected routes, use `{{studentToken}}` or `{{adminToken}}` in Authorization header

## Troubleshooting

### "Authentication required" with valid token
- Check if Authorization header is properly formatted: `Bearer YOUR_TOKEN`
- Ensure no extra spaces or characters in the token

### "Invalid token type" error
- Student tokens can't access admin routes
- Admin tokens can't access student routes
- Check which endpoint you're calling

### Token still expires quickly
- Verify the token was generated after the code changes
- Old tokens might still have 1-hour expiration

### Page refresh logs out user
- Check if frontend is storing token in localStorage/sessionStorage
- Verify token is being retrieved and set in axios headers on page load
