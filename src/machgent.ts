import TelegramBot from 'node-telegram-bot-api';
import { mastra } from './mastra';
import { telegramMatchingAgent } from './mastra/agents/telegramMatchingAgent';
import { registrationStates } from './mastra/models/user';

// Replace with your Telegram bot token
const token = process.env.TELEGRAM_BOT_TOKEN || '';

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set. Please set it in your .env file.');
  process.exit(1);
}

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// Use the imported matching agent
const matchingAgent = telegramMatchingAgent;

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Error: Could not identify user.');
    return;
  }

  // Welcome message
  bot.sendMessage(
    chatId,
    `Welcome to the Project Team Matching Bot! 👋\n\n` +
    `I'm here to help you find team members with complementary skills for your group projects. Here's what you can do:\n\n` +
    `- /register - Create or update your profile with your skills and interests\n` +
    `- /profile - View your profile and current connections\n` +
    `- /matches - Find potential team members with complementary skills\n` +
    `- /help - Get help with using the bot\n\n` +
    `Let's get started! Use /register to create your profile.`
  );
});

// Handle /register command
bot.onText(/\/register/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Error: Could not identify user.');
    return;
  }

  // Start the registration process
  const response = await matchingAgent.generate([
    { role: 'user', content: 'I want to register.' }
  ], {
    threadId: `telegram-${userId}`,
    resourceId: `user-${userId}`,
  });

  bot.sendMessage(chatId, response.text || 'No response generated.');
});

// Handle /profile command
bot.onText(/\/profile/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Error: Could not identify user.');
    return;
  }

  // Get user profile
  const response = await matchingAgent.generate([
    { role: 'user', content: 'Show me my profile.' }
  ], {
    threadId: `telegram-${userId}`,
    resourceId: `user-${userId}`,
  });

  bot.sendMessage(chatId, response.text || 'No response generated.');
});

// Handle /matches command
bot.onText(/\/matches/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) {
    bot.sendMessage(chatId, 'Error: Could not identify user.');
    return;
  }

  // Find matches
  const response = await matchingAgent.generate([
    { role: 'user', content: 'Find me some matches.' }
  ], {
    threadId: `telegram-${userId}`,
    resourceId: `user-${userId}`,
  });

  bot.sendMessage(chatId, response.text || 'No response generated.');
});

// Handle /help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `Here's how to use the Project Team Matching Bot:\n\n` +
    `- /register - Start or continue the registration process to add your skills and interests\n` +
    `- /profile - View your current profile and team connections\n` +
    `- /matches - Find potential team members with complementary skills\n` +
    `- /help - Show this help message\n\n` +
    `To interact with the bot, simply respond to its messages. During registration, the bot will guide you through the process step by step.\n\n` +
    `When viewing potential team members, you can connect with them or pass based on their skills and project ideas. When there's mutual interest, you'll be connected!`
  );
});

// Handle regular messages (for registration process and match responses)
bot.on('message', async (msg) => {
  // Skip command messages
  if (msg.text?.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text || '';

  if (!userId) {
    bot.sendMessage(chatId, 'Error: Could not identify user.');
    return;
  }

  // Check if user is in registration process
  const registrationState = registrationStates[userId];

  // Forward the message to the agent
  const response = await matchingAgent.generate([
    { role: 'user', content: text }
  ], {
    threadId: `telegram-${userId}`,
    resourceId: `user-${userId}`,
  });

  bot.sendMessage(chatId, response.text || 'No response generated.');
});

// Start the bot
console.log('Telegram bot is running...');

export { bot };
