import client from '../server/lib/mongodb.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { topicId } = req.query;

    if (!topicId) {
        return res.status(400).json({ error: 'Topic ID is required' });
    }

    try {
        const db = client.db('quiz_engine');

        // Fetch topic info
        const topic = await db.collection('topics').findOne({ id: topicId });
        if (!topic) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        // Fetch questions associated with this topic
        const questions = await db.collection('questions').find({ topicId }).toArray();

        res.status(200).json({
            topic: topic.name,
            questions: questions.map(q => ({
                ...q,
                id: q.id || q._id.toString()
            }))
        });
    } catch (error) {
        console.error(`Error fetching quiz data for ${topicId}:`, error);
        res.status(500).json({ error: 'Failed to load quiz data' });
    }
}
