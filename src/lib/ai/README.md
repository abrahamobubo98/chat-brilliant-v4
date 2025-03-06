# AI Avatar Implementation

This folder contains the implementation of the AI Avatar feature, which allows users to have an AI represent them in conversations when they're offline.

## Architecture

The AI Avatar system is built using the following components:

1. **Vector Database Integration (`vectorstore.ts`)**
   - Uses Pinecone to store and retrieve message embeddings
   - Creates user-specific namespaces for each user's messages
   - Enables semantic search across user's conversation history

2. **Personality Profile System (`personality-profile.ts`)**
   - Analyzes a user's message history to create a personality profile
   - Captures communication style, typical greetings, tone, and vocabulary
   - Helps the AI avatar mimic the user's communication style

3. **RAG System (`rag-system.ts`)**
   - Implements Retrieval Augmented Generation
   - Fetches relevant context from the vector database
   - Generates responses that are informed by past conversations

4. **Avatar Manager (`avatar-manager.ts`)**
   - Manages avatar state (active/inactive)
   - Handles message processing and response generation
   - Coordinates between different components

## Convex Integration

The system integrates with the Convex backend through:

- `avatar.ts` - Backend API for avatar management
- Message handling in `messages.ts` that checks for offline users with active avatars

## Usage

To use the AI Avatar:

1. Enable the avatar in your profile settings
2. The system will analyze your communication style
3. When you go offline, your avatar will respond to messages on your behalf
4. You'll receive notifications about conversations your avatar handled

## Configuration

Configure the avatar system by setting these environment variables:

```
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX=your_pinecone_index_name
```

## Future Improvements

Planned enhancements:

- Fine-tuning capabilities for avatar responses
- Time-based activation scheduling
- Topic restrictions for avatars
- Multi-modal support (images, etc.)
- Enhanced conversation memory 