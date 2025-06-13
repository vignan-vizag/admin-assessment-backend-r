# Test Management API - CURL Commands

## Base URL
```
http://localhost:4000/api
```

## 1. CREATE/UPDATE TEST (Original Endpoint)
```bash
curl -X POST http://localhost:4000/api/tests/create \
  -H "Content-Type: application/json" \
  -d '{
    "testName": "Java Programming Test",
    "categoryName": "Coding",
    "questionsText": "What is Java? (Programming Language, Database, Operating System, Framework) [Programming Language]\nWhich keyword is used for inheritance? (extends, implements, super, this) [extends]"
  }'
```

## 2. GET ALL TESTS
```bash
curl -X GET http://localhost:4000/api/tests/all
```

## 3. GET TEST BY ID
```bash
curl -X GET http://localhost:4000/api/tests/YOUR_TEST_ID_HERE
```

## 4. UPDATE TEST NAME
```bash
curl -X PUT http://localhost:4000/api/tests/YOUR_TEST_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "testName": "Updated Java Programming Test"
  }'
```

## 5. DELETE ENTIRE TEST
```bash
curl -X DELETE http://localhost:4000/api/tests/YOUR_TEST_ID_HERE
```

## 6. ADD NEW CATEGORY TO TEST
```bash
curl -X POST http://localhost:4000/api/tests/YOUR_TEST_ID_HERE/categories \
  -H "Content-Type: application/json" \
  -d '{
    "categoryName": "Aptitude",
    "questionsText": "What is 2+2? (3, 4, 5, 6) [4]\nWhat is 10-5? (3, 4, 5, 6) [5]"
  }'
```

## 7. UPDATE CATEGORY
```bash
curl -X PUT http://localhost:4000/api/tests/YOUR_TEST_ID_HERE/categories/YOUR_CATEGORY_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "categoryName": "Advanced Coding",
    "questionsText": "What is polymorphism? (Inheritance, Encapsulation, Multiple forms, Abstraction) [Multiple forms]"
  }'
```

## 8. DELETE CATEGORY
```bash
curl -X DELETE http://localhost:4000/api/tests/YOUR_TEST_ID_HERE/categories/YOUR_CATEGORY_ID_HERE
```

## 9. ADD SINGLE QUESTION TO CATEGORY
```bash
curl -X POST http://localhost:4000/api/tests/YOUR_TEST_ID_HERE/categories/YOUR_CATEGORY_ID_HERE/questions \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the main method signature in Java?",
    "options": [
      "public static void main(String[] args)",
      "public void main(String[] args)",
      "static void main(String[] args)",
      "public static main(String[] args)"
    ],
    "correctAnswer": "public static void main(String[] args)"
  }'
```

## 10. UPDATE SPECIFIC QUESTION
```bash
curl -X PUT http://localhost:4000/api/tests/YOUR_TEST_ID_HERE/categories/YOUR_CATEGORY_ID_HERE/questions/YOUR_QUESTION_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the updated question?",
    "options": [
      "Option A",
      "Option B", 
      "Option C",
      "Option D"
    ],
    "correctAnswer": "Option B"
  }'
```

## 11. DELETE SPECIFIC QUESTION
```bash
curl -X DELETE http://localhost:4000/api/tests/YOUR_TEST_ID_HERE/categories/YOUR_CATEGORY_ID_HERE/questions/YOUR_QUESTION_ID_HERE
```

## 12. GET STUDENTS RANKINGS (Reports)
```bash
curl -X POST http://localhost:4000/api/tests/getStudentsRanks \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2024,
    "testName": "Java Programming Test",
    "branch": "CSE",
    "section": "A"
  }'
```

## 13. GET ALL STUDENT RANKINGS FOR A TEST
```bash
curl -X GET "http://localhost:4000/api/students/rankings/YOUR_TEST_ID_HERE/2024"
```

## 14. GET INDIVIDUAL STUDENT RANK
```bash
curl -X GET "http://localhost:4000/api/students/rank/YOUR_STUDENT_ID_HERE?returnAllRankings=true"
```

## 15. GET RANDOM QUESTIONS FOR STUDENT
```bash
curl -X GET http://localhost:4000/api/tests/get-random/Java%20Programming%20Test/Coding
```

## 16. ASSIGN TEST TO STUDENTS
```bash
curl -X POST http://localhost:4000/api/tests/YOUR_TEST_ID_HERE/assign \
  -H "Content-Type: application/json" \
  -d '{
    "studentIds": ["STUDENT_ID_1", "STUDENT_ID_2"],
    "year": 2024
  }'
```

## 17. START TEST
```bash
curl -X POST http://localhost:4000/api/tests/YOUR_TEST_ID_HERE/start \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "YOUR_STUDENT_ID_HERE",
    "testId": "YOUR_TEST_ID_HERE",
    "year": 2024
  }'
```

## 18. SUBMIT TEST MARKS
```bash
curl -X POST http://localhost:4000/api/tests/YOUR_TEST_ID_HERE/submit \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "YOUR_STUDENT_ID_HERE",
    "testId": "YOUR_TEST_ID_HERE",
    "year": 2024,
    "marks": {
      "Coding": 8,
      "Aptitude": 7,
      "Math": 9
    }
  }'
```

## 19. UPDATE TEST STATUS (LIVE/OFFLINE) - NEW
```bash
curl -X PUT http://localhost:4000/api/tests/YOUR_TEST_ID_HERE/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "live"
  }'
```

## 20. GET ALL TESTS WITH STATUS (ADMIN) - NEW
```bash
curl -X GET http://localhost:4000/api/tests/admin/all
```

## 21. GET ONLY LIVE TESTS (STUDENTS) - NEW
```bash
curl -X GET http://localhost:4000/api/tests/live
```

---

## Test Status Management

### Status Values:
- `"live"` - Test is active and available to students
- `"offline"` - Test is inactive and not visible to students

### Default Behavior:
- All new tests are created with status `"offline"` by default
- Admin must manually change status to `"live"` to make tests available to students
- Students can only see and access tests with status `"live"`
- Students cannot see tests with status `"offline"`

### Admin Management:
- Use `GET /api/tests/admin/all` to see all tests with their current status
- Use `PUT /api/tests/:testId/status` to change test status
- Use `GET /api/tests/all` for backward compatibility (shows all tests with status)

### Student Access:
- Use `GET /api/tests/live` to get only live/available tests
- Students should only be allowed to access live tests for taking exams
- `GET /api/tests/get-random/:testName/:categoryName` now only works for live tests

---

## Question Format Examples:

### Inline Format:
```
What is Java? (Programming Language, Database, Operating System, Framework) [Programming Language]
Which keyword is used for inheritance? (extends, implements, super, this) [extends]
```

### Block Format:
```
Question: What is polymorphism in Java?
A) Inheritance B) Encapsulation C) Multiple forms D) Abstraction
Answer: Multiple forms

Question: What is the main method signature?
A) public static void main(String[] args) B) public void main(String[] args) C) static void main(String[] args) D) public static main(String[] args)
Answer: public static void main(String[] args)
```

---

## Notes:
- Replace `YOUR_TEST_ID_HERE`, `YOUR_CATEGORY_ID_HERE`, `YOUR_QUESTION_ID_HERE`, `YOUR_STUDENT_ID_HERE` with actual IDs
- Valid categories: "Coding", "Math", "Behavioral", "Aptitude"
- All endpoints return JSON responses
- The server runs on port 4000 by default
- Most POST/PUT requests require Content-Type: application/json header
