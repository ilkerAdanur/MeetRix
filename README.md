# Telegram Matching Bot

A Telegram bot built with Mastra that helps users match with each other based on their preferences.

## Features

- User registration with profile creation
- Matching algorithm based on user preferences
- Like/reject system for potential matches
- Notification when users match with each other

## Prerequisites

- Node.js (v20.0+)
- Telegram Bot Token (from BotFather)
- OpenAI API Key

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.development` file with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   ```

## Getting a Telegram Bot Token

1. Open Telegram and search for `@BotFather`
2. Start a chat with BotFather and send `/newbot`
3. Follow the instructions to create a new bot
4. BotFather will give you a token for your new bot
5. Copy this token to your `.env.development` file

## Running the Application

To run the application in development mode:

```
npm run dev
```

To run only the Telegram bot:

```
npm run telegram
```

To build and run the production version:

```
npm run build
npm start
```

## Bot Commands

- `/start` - Start the bot and see welcome message
- `/register` - Start or continue the registration process
- `/profile` - View your profile
- `/matches` - Find potential matches
- `/help` - Get help with using the bot

## How It Works

1. Users register by providing their name, age, gender, interests, bio, and preferences
2. The bot finds potential matches based on user preferences
3. Users can like or reject potential matches
4. When two users like each other, it's a match!
5. Users are notified when they have a new match

## Project Structure

- `src/index.ts` - Main entry point
- `src/telegramBot.ts` - Telegram bot integration
- `src/mastra/` - Mastra framework files
  - `agents/telegramMatchingAgent.ts` - Matching agent
  - `models/user.ts` - User model
  - `tools/userTools.ts` - Tools for user registration and matching

## License

MIT
