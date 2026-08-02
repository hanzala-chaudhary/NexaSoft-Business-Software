const http = require('http');

// Har 2 minute baad backend ko ping karega taake DB awake rahay
setInterval(() => {
  http.get('http://localhost:4000/health', (res) => {
    console.log(`[Anti-Sleep] System Awake Ping: ${res.statusCode} - ${new Date().toLocaleTimeString()}`);
  }).on('error', (e) => {
    console.error(`Ping error: ${e.message}`);
  });
}, 120000); // 120,000 ms = 2 minutes

console.log("Anti-Sleep script is running... DB will not sleep now!");