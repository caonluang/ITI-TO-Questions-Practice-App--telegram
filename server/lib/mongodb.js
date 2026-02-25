import { MongoClient } from 'mongodb';
import { attachDatabasePool } from '@vercel/functions';

/**
 * MongoDB client configuration for Vercel Serverless Functions.
 * This pattern ensures proper connection pooling and cleanup.
 */

const options = {
    appName: "devrel.vercel.integration",
    maxIdleTimeMS: 5000
};

if (!process.env.MONGODB_URI) {
    throw new Error('Please add your MONGODB_URI to your .env file');
}

const client = new MongoClient(process.env.MONGODB_URI, options);

// Attach the client to ensure proper cleanup on function suspension
// This prevents connection leaks in serverless environments
attachDatabasePool(client);

// Export a module-scoped MongoClient to ensure the client can be shared across functions.
export default client; 
