// Simple server to demonstrate port change
const http = require('http');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get port from environment variable or use default
const port = process.env.MASTRA_PORT || 4111;

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(`
    <html>
      <head>
        <title>Telegram Project Team Matching Bot</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #333; }
          .container { max-width: 800px; margin: 0 auto; }
          .info { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
          .commands { margin-top: 20px; }
          .command { margin-bottom: 10px; }
          .command-name { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Telegram Project Team Matching Bot</h1>
          <p>This server is running on port ${port}</p>
          
          <div class="info">
            <h2>About the Bot</h2>
            <p>This is a Telegram bot that helps users find team members with complementary skills for group projects.</p>
          </div>
          
          <div class="commands">
            <h2>Bot Commands</h2>
            <div class="command">
              <span class="command-name">/start</span> - Start the bot and see welcome message
            </div>
            <div class="command">
              <span class="command-name">/register</span> - Create or update your profile with your skills and interests
            </div>
            <div class="command">
              <span class="command-name">/profile</span> - View your profile and current connections
            </div>
            <div class="command">
              <span class="command-name">/matches</span> - Find potential team members with complementary skills
            </div>
            <div class="command">
              <span class="command-name">/help</span> - Get help with using the bot
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  console.log(`Telegram bot is also running and ready to accept commands.`);
});
