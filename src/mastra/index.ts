
import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { LibSQLStore } from '@mastra/libsql';

import { weatherAgent, telegramMatchingAgent } from './agents';

// Get port from environment variable or use default
const port = process.env.MASTRA_PORT ? parseInt(process.env.MASTRA_PORT) : 4111;

export const mastra = new Mastra({
  agents: { weatherAgent, telegramMatchingAgent },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
  server: {
    port: port
  }
});
