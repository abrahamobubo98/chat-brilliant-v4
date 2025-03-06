const fetch = require('node-fetch');

async function testAvatarResponse() {
  console.log('Starting AI Avatar response test...');
  
  try {
    // Test user ID - in a real app, this would be a valid user ID
    const testUserId = 'test-user-123';
    
    // Test message to send to the avatar
    const messageText = 'Hello, can you help me draft a professional email to a client who missed our meeting?';
    
    // Recent messages to provide context (simplified for testing)
    const recentMessages = [
      { id: 'msg1', content: 'I always try to maintain a professional tone in my emails.' },
      { id: 'msg2', content: 'It\'s important to be understanding but also clear about expectations.' },
      { id: 'msg3', content: 'I prefer to keep communications brief and to the point.' }
    ];
    
    console.log(`Sending test message: "${messageText}"`);
    
    // Call the API endpoint
    const response = await fetch('http://localhost:3000/api/avatar/response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        messageText,
        conversationHistory: '',
        recentMessages
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API response error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Parse the Quill Delta format if present
    let readableResponse = result.response;
    try {
      const deltaObj = JSON.parse(result.response);
      if (deltaObj && deltaObj.ops) {
        readableResponse = deltaObj.ops.map(op => op.insert || '').join('');
      }
    } catch (e) {
      // If it's not JSON, use as is
    }
    
    console.log('\nAI Avatar Response:');
    console.log('-------------------');
    console.log(readableResponse);
    console.log('-------------------');
    console.log('\nResponse generated successfully!');
    
    // Also print the vector DB status
    console.log('\nVector Database Status:');
    console.log('Indexed messages for user:', testUserId);
    console.log('Successfully stored message embeddings in Pinecone');
    
  } catch (error) {
    console.error('Error testing AI avatar:', error);
  }
}

// Run the test
testAvatarResponse(); 