# Telegram Project Team Matching Bot

A Telegram bot built with Mastra that helps users find team members with complementary skills for group projects. The bot stores user data in Google Sheets for easy management.

## Features

- User registration with skills and project interests
- Matching algorithm based on complementary skills
- Profile viewing and updating
- Google Sheets integration for data storage
- Direct contact with potential team members via Telegram

## Prerequisites

- Node.js (v20.0+)
- Telegram Bot Token (from BotFather)
- OpenAI API Key
- Google Sheets API credentials (service account JSON file)
- Google Sheets document with edit permissions for the service account

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
   MASTRA_PORT=5000  # Optional: custom port for the Mastra API
   ```
4. Place your Google Sheets service account JSON file in the project root directory
5. Share your Google Sheets document with the service account email address (found in the JSON file)

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

To run the standalone Telegram bot with Google Sheets integration:

```
node telegramBotWithSheets.cjs
```

## Bot Commands

- `/start` - Start the bot and see welcome message
- `/kayit` or `/register` - Start or continue the registration process
- `/profil` or `/profile` - View your profile
- `/eslesme` or `/matches` - Find potential team members with complementary skills
- `/guncelle` or `/update` - Update your profile information
- `/yardim` or `/help` - Get help with using the bot

The bot supports both Turkish and English commands.

## How It Works

1. Users register by providing their name, technical skills, past projects, bio, skills they're looking for, project idea, and location
2. The bot stores this information in a Google Sheets document
3. When users search for matches, the bot finds other users with complementary skills
4. The bot shows potential team members sorted by skill compatibility
5. Users can contact potential team members directly via Telegram
6. Users can update their profile information at any time

## Project Structure

- `src/index.ts` - Main entry point
- `src/machgent.ts` - Telegram bot integration with Mastra
- `src/mastra/` - Mastra framework files
  - `agents/telegramMatchingAgent.ts` - Matching agent (uses gpt-4o-mini)
  - `models/user.ts` - User model with skills and project fields
  - `tools/userTools.ts` - Tools for user registration and matching
- `telegramBotWithSheets.cjs` - Standalone Telegram bot with Google Sheets integration
- `googleSheetsService.cjs` - Service for Google Sheets operations

## Google Sheets Integration

The bot integrates with Google Sheets to store and retrieve user data:

1. User data is stored in a Google Sheets document named "Ekip Eslesme Botu"
2. The first sheet (Sheet1) is used with the following columns:
   - İsim (Name)
   - Beceriler (Skills)
   - Projeler (Projects)
   - Biyografi (Bio)
   - Aradığı Beceriler (Skills Looking For)
   - Proje Fikri (Project Idea)
   - Lokasyon (Location)
   - Telegram ID

## Matching Algorithm

The matching algorithm works as follows:

1. When a user requests matches, the bot retrieves all users from Google Sheets
2. The bot calculates a match score for each user based on complementary skills
3. Users are sorted by match score (highest first)
4. The bot shows the best match to the user
5. If there are no users with matching skills, the bot will show any available user
6. Only if there are no other users at all will the bot show "No potential team members found"

## License

MIT
