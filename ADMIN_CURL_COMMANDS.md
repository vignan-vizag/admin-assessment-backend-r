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

## 4. Error Testing

### Test with Invalid Credentials
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "invalid-user",
    "password": "wrong-password"
  }'
```

### Test Protected Route Without Token
```bash
curl -X GET http://localhost:3000/api/admin/profile \
  -H "Content-Type: application/json"
```

### Test Protected Route With Invalid Token
```bash
curl -X GET http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer invalid_token_here" \
  -H "Content-Type: application/json"
```

## 5. Complete Test Flow Example

### Step 1: Login and Save Token
```bash
# Save the token from this response
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "principal-viit",
    "password": "principal-viit"
  }'
```

### Step 2: Use Token for Authenticated Requests
```bash
# Replace TOKEN_FROM_STEP_1 with actual token
export ADMIN_TOKEN="TOKEN_FROM_STEP_1"

# Get profile
curl -X GET http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

## 6. Bash Script for Easy Testing

Create a file called `test_admin_auth.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "Testing Admin Authentication System"
echo "=================================="

# Test Principal Login
echo "1. Testing Principal Login..."
PRINCIPAL_RESPONSE=$(curl -s -X POST $BASE_URL/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "principal-viit",
    "password": "principal-viit"
  }')

echo "Principal Login Response:"
echo $PRINCIPAL_RESPONSE | jq .

# Extract token (requires jq)
PRINCIPAL_TOKEN=$(echo $PRINCIPAL_RESPONSE | jq -r '.token')

if [ "$PRINCIPAL_TOKEN" != "null" ]; then
  echo "2. Testing Principal Profile Access..."
  curl -s -X GET $BASE_URL/api/admin/profile \
    -H "Authorization: Bearer $PRINCIPAL_TOKEN" \
    -H "Content-Type: application/json" | jq .
fi

echo ""
echo "3. Testing CSE HOD Login..."
CSE_HOD_RESPONSE=$(curl -s -X POST $BASE_URL/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "csehod-viit",
    "password": "csehod-viit"
  }')

echo "CSE HOD Login Response:"
echo $CSE_HOD_RESPONSE | jq .

echo ""
echo "4. Testing Invalid Credentials..."
curl -s -X POST $BASE_URL/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "invalid-user",
    "password": "wrong-password"
  }' | jq .
```

### To run the script:
```bash
chmod +x test_admin_auth.sh
./test_admin_auth.sh
```

## Notes

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
