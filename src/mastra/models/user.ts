import { z } from 'zod';

// Define the user schema
export const UserSchema = z.object({
  id: z.string(),
  telegramId: z.number(),
  name: z.string(),
  skills: z.array(z.string()),
  pastProjects: z.array(z.string()),
  bio: z.string(),
  lookingForSkills: z.array(z.string()),
  projectIdea: z.string().optional(),
  location: z.string().optional(),
  registrationComplete: z.boolean().default(false),
  matches: z.array(z.string()).default([]),
  rejections: z.array(z.string()).default([]),
  pendingMatches: z.array(z.string()).default([]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// Define the user type
export type User = z.infer<typeof UserSchema>;

// In-memory user database (in a real app, you would use a proper database)
export const users: Record<string, User> = {};

// User registration state for tracking multi-step registration
export interface RegistrationState {
  telegramId: number;
  currentStep: 'name' | 'skills' | 'pastProjects' | 'bio' | 'lookingForSkills' | 'projectIdea' | 'location' | 'complete';
  data: Partial<User>;
}

// In-memory registration state storage
export const registrationStates: Record<number, RegistrationState> = {};
