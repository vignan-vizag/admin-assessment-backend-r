const axios = require('axios');

async function testLeaderboard() {
  try {
    // Login to get token
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:4000/api/admin/login', {
      username: 'principal-viit',
      password: 'principal-viit'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful');
    
    // Test 2028 regular leaderboard
    console.log('\nTesting 2028 regular leaderboard...');
    const leaderboardResponse = await axios.get('http://localhost:4000/api/admin/leaderboard/2028', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('2028 Regular Leaderboard Results:');
    console.log(`Total students evaluated: ${leaderboardResponse.data.totalStudentsEvaluated}`);
    console.log(`Leaderboard entries: ${leaderboardResponse.data.leaderboard.length}`);
    
    // Test 2028 overall leaderboard
    console.log('\nTesting 2028 overall leaderboard...');
    const overallResponse = await axios.get('http://localhost:4000/api/admin/overall-leaderboard/2028', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('2028 Overall Leaderboard Results:');
    console.log(`Total students evaluated: ${overallResponse.data.totalStudentsEvaluated}`);
    console.log(`Total students in year: ${overallResponse.data.totalStudentsInYear}`);
    console.log(`Leaderboard entries: ${overallResponse.data.overallLeaderboard.length}`);
    
    if (overallResponse.data.overallLeaderboard.length > 0) {
      console.log('\nTop 3 students:');
      overallResponse.data.overallLeaderboard.slice(0, 3).forEach(student => {
        console.log(`${student.rank}. ${student.name} (${student.rollno}) - Score: ${student.totalScore}`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

setTimeout(testLeaderboard, 1000); // Wait 1 second before testing
