import { OpenAI } from "@langchain/openai";

/**
 * Generate a personality profile for a user based on their message history
 */
export async function generateUserPersonalityProfile(messages: string[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured. Using default personality profile.");
    return "Professional, clear, and concise communicator who values efficiency and clarity.";
  }

  // Ensure we have enough messages to analyze
  if (messages.length < 10) {
    return "Friendly and articulate communicator who values clarity and respect.";
  }

  try {
    // Sample messages if there are too many (to keep costs reasonable)
    const sampleSize = Math.min(50, messages.length);
    const sampledMessages = messages
      .sort(() => 0.5 - Math.random()) // Simple shuffle
      .slice(0, sampleSize)
      .join("\n\n");

    // Create the prompt
    const prompt = `
I need you to analyze the following messages from a user and create a concise personality profile. The profile will be used to help generate responses in the user's own communication style.

Here are sample messages from the user:

${sampledMessages}

Based on these messages, create a brief personality profile (2-3 sentences) that describes:
1. The user's communication style (formal/informal, verbose/concise, emotional/reserved, etc.)
2. Notable personality traits that can be inferred from their writing
3. Any particular phrases, expressions, or punctuation habits they frequently use

Format your response as a simple paragraph without any introduction or explanation.
`;

    // Initialize the LLM
    const model = new OpenAI({ 
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.3, // Lower temperature for more consistent analysis
      modelName: "gpt-4o", // Using GPT-4o for better analysis
    });
    
    // Generate the profile
    const response = await model.call(prompt);
    
    return response.trim();
  } catch (error) {
    console.error("Error generating personality profile:", error);
    return "Friendly and articulate communicator who values clarity and respect.";
  }
} 