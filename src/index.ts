import { config } from 'dotenv';

// Load environment variables first
config();

import './mastra'; // Import for side effects
import './machgent'; // Import for side effects

// Mastra is automatically initialized when imported
console.log('Mastra initialized');

// Log the port being used
console.log(`Mastra API running on port ${process.env.MASTRA_PORT || 4111}`);

// The Telegram bot is already started in machgent.ts
console.log('Telegram bot is running...');
