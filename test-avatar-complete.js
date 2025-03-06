const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testAvatarWithVectorDB() {
  console.log('Starting comprehensive AI Avatar test with vector database...');
  
  try {
    // Step 1: Test vector database connectivity
    console.log('\n--- STEP 1: Testing Vector Database Connectivity ---');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const indexes = await pinecone.listIndexes();
    console.log('Available indexes:', indexes.indexes.map(idx => idx.name));
    
    const index = pinecone.Index('chat-brilliant-v4');
    const stats = await index.describeIndexStats();
    console.log('Index stats:', stats);
    
    // Step 2: Create and store user message embeddings
    console.log('\n--- STEP 2: Creating and Storing User Message Embeddings ---');
    const userId = 'test-user-123';
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    // Sample user messages
    const userMessages = [
      'I prefer to keep my emails concise and to the point.',
      'When dealing with clients, I always maintain a professional tone.',
      'I believe in being direct but respectful in my communications.',
      'I like to start my emails with a friendly greeting.',
      'I always make sure to follow up with clear action items.'
    ];
    
    // Create and store embeddings for each message
    for (let i = 0; i < userMessages.length; i++) {
      const message = userMessages[i];
      console.log(`Processing message ${i+1}: "${message.substring(0, 30)}..."`);
      
      const embedding = await embeddings.embedQuery(message);
      
      await index.upsert([{
        id: `test-msg-${i+1}`,
        values: embedding,
        metadata: {
          text: message,
          userId: userId,
          timestamp: Date.now() - (i * 60000) // Stagger timestamps
        }
      }]);
      
      console.log(`Stored embedding for message ${i+1}`);
    }
    
    // Step 3: Test the AI avatar response
    console.log('\n--- STEP 3: Testing AI Avatar Response ---');
    const testMessage = 'Hello, can you help me draft a professional email to a client who missed our meeting?';
    console.log(`Sending test message: "${testMessage}"`);
    
    // Format messages for the API
    const recentMessages = userMessages.map((content, i) => ({
      id: `test-msg-${i+1}`,
      content
    }));
    
    // Call the API endpoint
    try {
      const response = await fetch('http://localhost:3000/api/avatar/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          messageText: testMessage,
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
      
    } catch (error) {
      console.error('Error calling AI avatar API:', error);
      console.log('\nFalling back to direct vector similarity search...');
      
      // Step 4: Fallback to direct vector similarity search
      console.log('\n--- STEP 4: Direct Vector Similarity Search ---');
      const queryEmbedding = await embeddings.embedQuery(testMessage);
      
      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 3,
        includeMetadata: true
      });
      
      console.log('Similar messages found:');
      if (queryResponse.matches && queryResponse.matches.length > 0) {
        queryResponse.matches.forEach((match, i) => {
          console.log(`${i+1}. "${match.metadata.text}" (Score: ${match.score})`);
        });
      } else {
        console.log('No similar messages found');
      }
    }
    
    console.log('\nComprehensive AI Avatar test completed!');
    
  } catch (error) {
    console.error('Error in comprehensive test:', error);
  }
}

// Run the test
testAvatarWithVectorDB(); 