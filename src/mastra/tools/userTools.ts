import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { User, UserSchema, users, registrationStates, RegistrationState } from '../models/user';

// Tool to start or continue user registration
export const registerUserTool = createTool({
  id: 'register-user',
  description: 'Start or continue user registration process for project team matching',
  inputSchema: z.object({
    telegramId: z.number().describe('Telegram user ID'),
    input: z.string().describe('User input for the current registration step'),
    currentStep: z.enum([
      'start', 'name', 'skills', 'pastProjects', 'bio', 'lookingForSkills', 'projectIdea', 'location'
    ]).describe('Current registration step'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    nextStep: z.enum([
      'name', 'skills', 'pastProjects', 'bio', 'lookingForSkills', 'projectIdea', 'location', 'complete'
    ]).optional(),
    isComplete: z.boolean(),
    user: UserSchema.partial().optional(),
    matches: z.array(UserSchema).optional(),
  }),
  execute: async ({ context }) => {
    const { telegramId, input, currentStep } = context;

    // Initialize registration state if it doesn't exist
    if (!registrationStates[telegramId] && currentStep === 'start') {
      registrationStates[telegramId] = {
        telegramId,
        currentStep: 'name',
        data: { telegramId }
      };

      return {
        success: true,
        message: "Let's start your registration for project team matching! What's your name?",
        nextStep: 'name' as const,
        isComplete: false
      };
    }

    // Get current registration state
    const state = registrationStates[telegramId];
    if (!state) {
      return {
        success: false,
        message: "Registration not started. Please start registration first.",
        isComplete: false
      };
    }

    // Process the current step
    try {
      switch (currentStep) {
        case 'name':
          state.data.name = input.trim();
          state.currentStep = 'skills';
          return {
            success: true,
            message: "Great! What are your technical skills? (comma-separated list, e.g., JavaScript, React, Node.js, UI/UX Design, Project Management)",
            nextStep: 'skills' as const,
            isComplete: false,
            user: state.data
          };

        case 'skills':
          state.data.skills = input.split(',').map((i: string) => i.trim()).filter((i: string) => i.length > 0);
          state.currentStep = 'pastProjects';
          return {
            success: true,
            message: "What projects have you worked on in the past? (comma-separated list)",
            nextStep: 'pastProjects' as const,
            isComplete: false,
            user: state.data
          };

        case 'pastProjects':
          state.data.pastProjects = input.split(',').map((i: string) => i.trim()).filter((i: string) => i.length > 0);
          state.currentStep = 'bio';
          return {
            success: true,
            message: "Tell us a bit about yourself and your experience (your bio):",
            nextStep: 'bio' as const,
            isComplete: false,
            user: state.data
          };

        case 'bio':
          state.data.bio = input.trim();
          state.currentStep = 'lookingForSkills';
          return {
            success: true,
            message: "What skills are you looking for in potential team members? (comma-separated list)",
            nextStep: 'lookingForSkills' as const,
            isComplete: false,
            user: state.data
          };

        case 'lookingForSkills':
          state.data.lookingForSkills = input.split(',').map((i: string) => i.trim()).filter((i: string) => i.length > 0);
          state.currentStep = 'projectIdea';
          return {
            success: true,
            message: "Do you have a project idea you'd like to work on? Please describe it briefly:",
            nextStep: 'projectIdea' as const,
            isComplete: false,
            user: state.data
          };

        case 'projectIdea':
          state.data.projectIdea = input.trim();
          state.currentStep = 'location';
          return {
            success: true,
            message: "What's your location? (city/country)",
            nextStep: 'location' as const,
            isComplete: false,
            user: state.data
          };

        case 'location':
          state.data.location = input.trim();
          state.currentStep = 'complete';

          // Create the user
          const userId = uuidv4();
          const newUser: User = {
            id: userId,
            telegramId: telegramId,
            name: state.data.name!,
            skills: state.data.skills!,
            pastProjects: state.data.pastProjects!,
            bio: state.data.bio!,
            lookingForSkills: state.data.lookingForSkills!,
            projectIdea: state.data.projectIdea,
            location: state.data.location,
            registrationComplete: true,
            matches: [],
            rejections: [],
            pendingMatches: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Save the user
          users[userId] = newUser;

          // Registration complete
          return {
            success: true,
            message: "Registration complete! You can now start matching with potential team members for your projects.",
            nextStep: 'complete',
            isComplete: true,
            user: newUser
          };

        default:
          return {
            success: false,
            message: "Invalid registration step",
            isComplete: false
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error during registration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isComplete: false
      };
    }
  }
});

// Tool to find potential matches for a user based on skills
export const findMatchesTool = createTool({
  id: 'find-matches',
  description: 'Find potential team members based on skills and project interests',
  inputSchema: z.object({
    telegramId: z.number().describe('Telegram user ID'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    matches: z.array(UserSchema).optional(),
  }),
  execute: async ({ context }) => {
    const { telegramId } = context;

    // Find the user
    const user = Object.values(users).find(u => u.telegramId === telegramId);
    if (!user) {
      return {
        success: false,
        message: "User not found. Please register first."
      };
    }

    // Get all potential matches (excluding the user themselves and already matched/rejected users)
    const allPotentialUsers = Object.values(users).filter(u => {
      // Skip the user themselves
      if (u.id === user.id) return false;

      // Skip users already matched or rejected
      if (user.matches.includes(u.id) || user.rejections.includes(u.id) || user.pendingMatches.includes(u.id)) return false;

      // Include all other users
      return true;
    });

    if (allPotentialUsers.length === 0) {
      return {
        success: true,
        message: "No potential team members found at the moment. Try again later when more users have registered.",
        matches: []
      };
    }

    // Calculate match scores for all potential users
    const scoredMatches = allPotentialUsers.map(u => {
      let matchScore = 0;

      // Check if the other user has skills that this user is looking for
      const skillsUserWants = user.lookingForSkills.filter(skill =>
        u.skills.some(uSkill => uSkill.toLowerCase().includes(skill.toLowerCase()))
      );

      if (skillsUserWants.length > 0) {
        matchScore += skillsUserWants.length * 2; // Higher weight for matching skills
      }

      // Check if this user has skills that the other user is looking for
      const skillsOtherWants = u.lookingForSkills.filter(skill =>
        user.skills.some(userSkill => userSkill.toLowerCase().includes(skill.toLowerCase()))
      );

      if (skillsOtherWants.length > 0) {
        matchScore += skillsOtherWants.length * 2;
      }

      return {
        user: u,
        score: matchScore
      };
    });

    // Sort by match score (highest first)
    scoredMatches.sort((a, b) => b.score - a.score);

    // Extract just the users from the scored matches
    const potentialMatches = scoredMatches.map(match => match.user);

    return {
      success: true,
      message: `Found ${potentialMatches.length} potential team members with complementary skills.`,
      matches: potentialMatches
    };
  }
});

// Tool to connect with or reject a potential team member
export const respondToMatchTool = createTool({
  id: 'respond-to-match',
  description: 'Connect with or reject a potential team member',
  inputSchema: z.object({
    telegramId: z.number().describe('Telegram user ID'),
    matchId: z.string().describe('ID of the potential team member'),
    response: z.enum(['connect', 'reject']).describe('User response to the potential team member'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    isMatch: z.boolean().optional(),
    match: UserSchema.optional(),
  }),
  execute: async ({ context }) => {
    const { telegramId, matchId, response } = context;

    // Find the user
    const user = Object.values(users).find(u => u.telegramId === telegramId);
    if (!user) {
      return {
        success: false,
        message: "User not found. Please register first."
      };
    }

    // Find the potential team member
    const potentialMatch = users[matchId];
    if (!potentialMatch) {
      return {
        success: false,
        message: "Potential team member not found."
      };
    }

    if (response === 'reject') {
      // Add to rejections
      user.rejections.push(matchId);
      user.updatedAt = new Date();

      return {
        success: true,
        message: "You've decided not to connect with this team member at this time.",
        isMatch: false
      };
    } else {
      // User wants to connect with the team member
      // Check if the team member already wanted to connect with the user
      if (potentialMatch.pendingMatches.includes(user.id)) {
        // It's a match!
        user.matches.push(matchId);
        potentialMatch.matches.push(user.id);

        // Remove from pending
        potentialMatch.pendingMatches = potentialMatch.pendingMatches.filter(id => id !== user.id);

        user.updatedAt = new Date();
        potentialMatch.updatedAt = new Date();

        // Create a message with contact information
        const matchMessage = `Great news! You and ${potentialMatch.name} are now connected for potential project collaboration.\n\n` +
          `${potentialMatch.name}'s skills: ${potentialMatch.skills.join(', ')}\n` +
          `Project idea: ${potentialMatch.projectIdea || 'Not specified'}\n\n` +
          `We recommend reaching out to start discussing your project ideas and how you can work together!`;

        return {
          success: true,
          message: matchMessage,
          isMatch: true,
          match: potentialMatch
        };
      } else {
        // Add to pending matches
        user.pendingMatches.push(matchId);
        user.updatedAt = new Date();

        return {
          success: true,
          message: "You've expressed interest in connecting with this team member. If they also want to connect with you, you'll be notified!",
          isMatch: false
        };
      }
    }
  }
});

// Tool to get user profile
export const getUserProfileTool = createTool({
  id: 'get-user-profile',
  description: 'Get user profile information for project team matching',
  inputSchema: z.object({
    telegramId: z.number().describe('Telegram user ID'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    user: UserSchema.optional(),
    isRegistered: z.boolean(),
    connections: z.array(UserSchema).optional(),
  }),
  execute: async ({ context }) => {
    const { telegramId } = context;

    // Find the user
    const user = Object.values(users).find(u => u.telegramId === telegramId);
    if (!user) {
      return {
        success: false,
        message: "User not found. Please register first.",
        isRegistered: false
      };
    }

    // Get user's connections (matches)
    const connections = user.matches.map(matchId => users[matchId]).filter(Boolean);

    return {
      success: true,
      message: "User profile retrieved successfully.",
      user,
      isRegistered: true,
      connections
    };
  }
});


