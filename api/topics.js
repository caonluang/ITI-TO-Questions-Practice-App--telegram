import client from '../server/lib/mongodb.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const db = client.db('quiz_engine');
        const topics = await db.collection('topics').find({}).toArray();

        // Transform _id if necessary or return as is
        const transformedTopics = topics.map(topic => ({
            ...topic,
            id: topic.id || topic._id.toString()
        }));

        res.status(200).json(transformedTopics);
    } catch (error) {
        console.error('Error fetching topics from MongoDB:', error);
        res.status(500).json({ error: 'Failed to load topics' });
    }
}
