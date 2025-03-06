# ChatBrilliant

ChatBrilliant is an AI-powered messaging platform that combines the functionality of modern chat applications with advanced AI features like avatars and semantic search.

## Features

- **Real-time Messaging**: Chat with team members in direct messages or channels
- **Workspaces**: Organize conversations into separate workspaces
- **AI Avatars**: Create and interact with AI avatars that can respond on your behalf
- **Semantic Search**: Find messages and content using natural language queries
- **Rich Media Support**: Share images and files with drag-and-drop functionality
- **Message Reactions**: React to messages with emojis
- **User Status**: Set your status and availability with custom emoji support
- **Mobile Responsive**: Works seamlessly across devices of all sizes

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **State Management**: Jotai, React Context
- **Backend**: Convex (serverless backend)
- **Authentication**: Clerk
- **Vector Database**: Pinecone (for semantic search)
- **AI**: OpenAI, LangChain

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Convex account (for backend)
- Clerk account (for authentication)
- Pinecone account (for vector database)
- OpenAI API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/chat-brilliant.git
cd chat-brilliant
```

2. Install dependencies
```bash
npm install
# or
yarn
```

3. Set up environment variables
   
   Create a `.env.local` file in the root directory based on the `.env.example` file.

4. Start the development server
```bash
# Start both Next.js and Convex
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `src/app` - Next.js pages and layout components
- `src/components` - Reusable UI components
- `src/features` - Feature-specific modules (auth, messages, workspaces, etc.)
- `src/lib` - Utility functions and shared logic
- `src/hooks` - Custom React hooks
- `src/convex` - Convex backend schemas and functions
- `convex/` - Convex backend configuration

## Authentication

ChatBrilliant uses Clerk for authentication. Users can sign up with email/password or social providers.

## Database Schema

The application uses Convex as a backend with the following main data models:
- Users
- Workspaces
- Members (users in workspaces)
- Channels
- Conversations (DMs)
- Messages
- Reactions

## AI Features

### Avatars
The avatar system allows users to create AI assistants that can respond on their behalf. These avatars learn from the user's messaging style and can provide contextually relevant responses.

### Semantic Search
The application uses Pinecone vector database to store and search message embeddings, enabling powerful semantic search capabilities.

## Deployment

### Deploying on Vercel

1. Push your code to a GitHub repository
2. Create a new project on Vercel
3. Link your GitHub repository
4. Set up environment variables
5. Deploy

### Deploying Convex

1. Create a new deployment in the Convex dashboard
2. Update the Convex URL in your environment variables
3. Deploy your functions with `npx convex deploy`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE)

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Convex](https://www.convex.dev/)
- [Clerk](https://clerk.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenAI](https://openai.com/)
- [Pinecone](https://www.pinecone.io/)
