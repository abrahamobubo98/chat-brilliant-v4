export async function generateAvatarResponse(
  userId: string,
  messageText: string,
  conversationHistory: string = "",
  recentMessages: any[] = []
): Promise<string> {
  try {
    // Call the AI avatar API endpoint
    const response = await fetch('/api/avatar/response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        messageText,
        conversationHistory,
        recentMessages,
      }),
    });

    if (!response.ok) {
      throw new Error(`API response error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error generating avatar response:', error);
    
    // Fallback response in case of error
    return JSON.stringify({
      ops: [
        { insert: "[AI Avatar] I received your message, but I'm having trouble generating a response at the moment.\n" }
      ]
    });
  }
} 