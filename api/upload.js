import client from '../server/lib/mongodb.js';

/**
 * Serverless function to handle quiz uploads.
 * Note: For simplicity in a serverless environment, we expect JSON or Text payload
 * rather than multipart/form-data, or we use a lightweight parser if needed.
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { topic, questions, rawText, fileName } = req.body;
        let quizData = { topic, questions };

        // If raw text is provided (like the original server-side parser), we parse it here
        if (rawText) {
            quizData = parseTxtToQuiz(rawText, topic || fileName);
        }

        if (!quizData.topic || !Array.isArray(quizData.questions)) {
            return res.status(400).json({ error: 'Invalid quiz data' });
        }

        const db = client.db('quiz_engine');

        // 1. Insert/Update Topic Metadata
        const topicId = (fileName || quizData.topic).toLowerCase().replaceAll(/[^a-z0-9_-]/g, '_');
        await db.collection('topics').updateOne(
            { id: topicId },
            {
                $set: {
                    name: quizData.topic,
                    questionCount: quizData.questions.length,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        // 2. Insert Questions (clearing old ones for this topic first)
        await db.collection('questions').deleteMany({ topicId });
        const questionsToInsert = quizData.questions.map((q, idx) => ({
            ...q,
            topicId,
            id: q.id || idx + 1
        }));
        await db.collection('questions').insertMany(questionsToInsert);

        res.status(200).json({ success: true, topicId });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload quiz data' });
    }
}

// Helper to parse TXT (mirrored from server.js)
function parseTxtToQuiz(text, topicName) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const questions = [];
    let current = {};
    let questionId = 1;

    for (const line of lines) {
        if (line.startsWith('Q:') || line.startsWith('q:')) {
            if (current.question) {
                current.id = questionId++;
                questions.push({ ...current });
                current = {};
            }
            current.question = line.substring(2).trim();
            current.options = [];
        } else if (/^[A-D]:/i.test(line)) {
            if (!current.options) current.options = [];
            current.options.push(line.substring(2).trim());
        } else if (line.toLowerCase().startsWith('correct:')) {
            const ans = line.substring(8).trim().toUpperCase();
            current.correctIndex = ['A', 'B', 'C', 'D'].indexOf(ans);
        } else if (line.toLowerCase().startsWith('explanation:')) {
            current.explanation = line.substring(12).trim();
        }
    }

    if (current.question) {
        current.id = questionId++;
        questions.push(current);
    }

    return { topic: topicName, questions };
}
