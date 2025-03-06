import { NextResponse } from 'next/server';
import { generateContextAwareResponse } from '@/lib/ai/rag-system';
import { generateUserPersonalityProfile } from '@/lib/ai/personality-profile';
import { indexUserMessages } from '@/lib/ai/vectorstore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, messageText, conversationHistory = "", recentMessages = [] } = body;

    if (!userId || !messageText) {
      return NextResponse.json(
        { error: 'Missing required parameters' }, 
        { status: 400 }
      );
    }

    // Process user messages first to ensure vector store is up to date
    if (recentMessages.length > 0) {
      await indexUserMessages(userId, recentMessages);
    }

    // Generate or retrieve a personality profile
    let personalityProfile = "Friendly and helpful professional who communicates clearly and concisely.";
    
    if (recentMessages.length > 10) {
      try {
        const messageTexts = recentMessages.map((m: { content?: string }) => m.content || "").filter(Boolean);
        personalityProfile = await generateUserPersonalityProfile(messageTexts);
      } catch (error) {
        console.error('Error generating personality profile:', error);
      }
    }

    // Generate context-aware response
    const response = await generateContextAwareResponse(
      userId,
      messageText,
      personalityProfile,
      conversationHistory
    );

    // Format the response as a Quill Delta object
    const formattedResponse = JSON.stringify({
      ops: [
        { insert: response + '\n' }
      ]
    });

    return NextResponse.json({ response: formattedResponse });
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Fallback response in case of error
    const fallbackResponse = JSON.stringify({
      ops: [
        { insert: "[AI Avatar] I received your message, but I'm having trouble generating a response at the moment.\n" }
      ]
    });
    
    return NextResponse.json(
      { response: fallbackResponse, error: String(error) },
      { status: 500 }
    );
  }
} 