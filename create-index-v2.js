const { Pinecone } = require('@pinecone-database/pinecone');

async function createPineconeIndex() {
  console.log('Starting Pinecone index creation process...');
  
  try {
    console.log('Initializing Pinecone client...');
    const pinecone = new Pinecone({
      apiKey: 'pcsk_7334cs_HVm39trGw84ZhKCPjdEond8FeaaEwirBDeiTxkacMLLMZaFbyEFuFccvjUEyXus',
    });
    
    console.log('Getting current indexes...');
    const currentIndexes = await pinecone.listIndexes();
    console.log('Current indexes:', currentIndexes);
    
    const indexName = 'chat-brilliant-v4';
    const indexExists = currentIndexes.indexes && currentIndexes.indexes.some(idx => idx.name === indexName);
    
    if (indexExists) {
      console.log(`Index ${indexName} already exists.`);
    } else {
      console.log(`Creating new index: ${indexName}...`);
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536,  // OpenAI embeddings dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      console.log('Index creation initiated!');
    }
  } catch (error) {
    console.error('Error in Pinecone index creation:', error);
  }
}

createPineconeIndex(); 