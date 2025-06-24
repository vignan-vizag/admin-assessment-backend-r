# Admin Authentication API

This document describes the admin authentication endpoints for the admin dashboard.

## Admin Accounts

The system comes with two pre-configured admin accounts:

1. **Principal Account**
   - Username: `principal-viit`
   - Password: `principal-viit`
   - Role: `principal`

2. **CSE HOD Account**
   - Username: `csehod-viit`
   - Password: `csehod-viit`
   - Role: `hod`

## API Endpoints

### 1. Admin Login

**POST** `/api/admin/login`

Login with admin credentials.

**Request Body:**
```json
{
  "username": "principal-viit",
  "password": "principal-viit"
}
```

**Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "admin_id",
    "username": "principal-viit",
    "role": "principal"
  },
  "message": "Admin login successful"
}
```

**Response (Error):**
```json
{
  "message": "Invalid credentials"
}
```

### 2. Get Admin Profile

**GET** `/api/admin/profile`

Get the logged-in admin's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "admin": {
    "id": "admin_id",
    "username": "principal-viit",
    "role": "principal",
    "createdAt": "2025-06-24T...",
    "updatedAt": "2025-06-24T..."
  }
}
```

### 3. Test Admin Authentication

**GET** `/api/admin/test`

Test endpoint to verify admin authentication is working.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "message": "Admin authentication successful!",
  "admin": {
    "username": "principal-viit",
    "role": "principal"
  }
}
```

## Authentication Flow

1. **Login**: Send POST request to `/api/admin/login` with username and password
2. **Receive Token**: Get JWT token in response
3. **Authenticate Requests**: Include token in Authorization header as `Bearer <token>`
4. **Token Expiry**: Admin tokens expire after 8 hours

## Role-Based Access Control

The system includes middleware for role-based access control:

- `authenticateAdmin`: Verifies admin JWT token
- `principalOnly`: Allows only principal role
- `hodOrPrincipal`: Allows both HOD and principal roles

## Usage Examples

### Login with cURL
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "principal-viit",
    "password": "principal-viit"
  }'
```

### Access Protected Route with cURL
```bash
curl -X GET http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Authentication with cURL
```bash
curl -X GET http://localhost:3000/api/admin/test \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Security Features

- Passwords are hashed using bcrypt
- JWT tokens include admin-specific claims
- Role-based access control
- 8-hour token expiration for admin sessions
- Separate token type for admin vs student authentication
