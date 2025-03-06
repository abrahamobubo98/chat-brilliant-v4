import { OpenAI } from "@langchain/openai";
import { retrieveRelevantMessages } from "./vectorstore";

/**
 * Generate a context-aware response using RAG
 */
export async function generateContextAwareResponse(
  userId: string,
  query: string,
  personalityProfile: string,
  conversationHistory: string = ""
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured. Using fallback response.");
    return "I'm not able to provide a personalized response at the moment. Please try again later.";
  }

  try {
    // Retrieve relevant context from the vector store
    const relevantMessages = await retrieveRelevantMessages(userId, query, 5);
    
    // Format the context for the prompt
    const contextText = relevantMessages.length > 0
      ? relevantMessages.map(doc => doc.pageContent).join("\n")
      : "No relevant past messages found.";
    
    // Format the conversation history
    const historyText = conversationHistory 
      ? `Recent conversation:\n${conversationHistory}\n`
      : "";
    
    // Create the prompt
    const prompt = `
You are an AI avatar named 'Brilliant' that helps a user communicate with their contacts. 

## User Personality Profile:
${personalityProfile}

## Relevant past messages from the user:
${contextText}

${historyText}

## Current message to respond to:
${query}

Please respond to the current message in a way that accurately reflects the user's communication style and personality based on the profile and past messages. 
Keep your response concise (1-2 paragraphs max) and relevant to the message. 
Don't mention that you're an avatar or AI assistant in your response.
`;

    // Initialize the LLM
    const model = new OpenAI({ 
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
      modelName: "gpt-4o", // Using GPT-4o for better quality responses
    });
    
    // Generate the response
    const response = await model.call(prompt);
    
    return response.trim();
  } catch (error) {
    console.error("Error generating context-aware response:", error);
    return "I'm experiencing some technical difficulties. Please try again later.";
  }
} 