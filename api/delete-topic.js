import client from '../server/lib/mongodb.js';

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { topicId } = req.query;

    if (!topicId) {
        return res.status(400).json({ error: 'Topic ID is required' });
    }

    try {
        const db = client.db('quiz_engine');

        // Prevent deleting built-in topics (just like server.js)
        const builtIn = ['dbms', 'os', 'cn'];
        if (builtIn.includes(topicId)) {
            return res.status(403).json({ error: 'Cannot delete built-in topics' });
        }

        // 1. Delete questions
        await db.collection('questions').deleteMany({ topicId });

        // 2. Delete topic metadata
        const result = await db.collection('topics').deleteOne({ id: topicId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        res.status(200).json({ success: true, message: `Topic "${topicId}" deleted successfully` });
    } catch (error) {
        console.error(`Error deleting topic ${topicId}:`, error);
        res.status(500).json({ error: 'Failed to delete topic' });
    }
}
