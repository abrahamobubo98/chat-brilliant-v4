import { generateContextAwareResponse } from './rag-system';
import { indexUserMessages } from './vectorstore';
import { generateUserPersonalityProfile } from './personality-profile';

export interface AvatarState {
  isActive: boolean;
  userId: string;
  personalityProfile?: string;
}

// Define a proper Message interface
export interface UserMessage {
  id: string;
  body: string;
  _creationTime: number;
}

// In-memory store for demo purposes - would be in a database in production
const avatarStates: Record<string, AvatarState> = {};

export const activateAvatar = async (userId: string, messages: UserMessage[]): Promise<AvatarState> => {
  // 1. Index user messages
  await indexUserMessages(
    userId,
    messages.map(m => ({
      id: m.id,
      content: m.body,
      timestamp: new Date(m._creationTime)
    }))
  );
  
  // 2. Generate personality profile
  const userMessageTexts = messages.map(m => m.body);
  const personalityProfile = await generateUserPersonalityProfile(userMessageTexts);
  
  // 3. Set avatar as active
  avatarStates[userId] = {
    isActive: true,
    userId,
    personalityProfile
  };
  
  return avatarStates[userId];
};

export const deactivateAvatar = (userId: string): void => {
  if (avatarStates[userId]) {
    avatarStates[userId].isActive = false;
  }
};

export const isAvatarActive = (userId: string): boolean => {
  return !!avatarStates[userId]?.isActive;
};

export const handleIncomingMessage = async (
  userId: string,
  incomingMessage: string,
  conversationHistory: string
): Promise<string | null> => {
  const avatarState = avatarStates[userId];
  
  if (!avatarState || !avatarState.isActive) {
    return null; // Avatar not active, don't respond
  }
  
  // Generate response using RAG
  const response = await generateContextAwareResponse(
    userId,
    incomingMessage,
    avatarState.personalityProfile || '',
    conversationHistory
  );
  
  return response;
}; 