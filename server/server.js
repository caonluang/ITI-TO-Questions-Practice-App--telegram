const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');

// Configure multer for file uploads (temp storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.json' || ext === '.txt') {
            cb(null, true);
        } else {
            cb(new Error('Only .json and .txt files are allowed'));
        }
    }
});

// Helper to get topic metadata
const getTopicMeta = (id) => {
    const metaMap = {
        dbms: { icon: '🗄️', color: '#667eea' },
        os: { icon: '💻', color: '#11998e' },
        cn: { icon: '🌐', color: '#ee0979' },
    };

    if (metaMap[id]) return metaMap[id];

    const defaultIcons = ['📚', '📝', '🧠', '💡', '🔬', '📐', '🎓', '📖'];
    const defaultColors = ['#ff9800', '#9c27b0', '#795548', '#607d8b', '#00bcd4', '#e91e63', '#4caf50', '#ff5722'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return {
        icon: defaultIcons[hash % defaultIcons.length],
        color: defaultColors[hash % defaultColors.length]
    };
};

// Parse TXT file to quiz JSON format
const parseTxtToQuiz = (text, topicName) => {
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

    // Push the last question
    if (current.question) {
        current.id = questionId++;
        if (!current.explanation) current.explanation = '';
        if (current.correctIndex === undefined) current.correctIndex = 0;
        questions.push(current);
    }

    return {
        topic: topicName || 'Imported Topic',
        questions
    };
};

// Endpoint to get all topics
app.get('/api/topics', async (req, res) => {
    try {
        const files = await fs.readdir(DATA_DIR);
        const topics = [];

        for (const file of files) {
            if (path.extname(file) === '.json') {
                const filePath = path.join(DATA_DIR, file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
                const id = path.basename(file, '.json');
                const meta = getTopicMeta(id);

                topics.push({
                    id,
                    name: data.topic,
                    icon: meta.icon,
                    color: meta.color,
                    questionCount: data.questions ? data.questions.length : 0
                });
            }
        }
        res.json(topics);
    } catch (error) {
        console.error('Error reading topics:', error);
        res.status(500).json({ error: 'Failed to load topics' });
    }
});

// Endpoint to get questions for a specific topic
app.get('/api/quiz/:topicId', async (req, res) => {
    try {
        const { topicId } = req.params;
        const filePath = path.join(DATA_DIR, `${topicId}.json`);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: 'Topic not found' });
        }

        const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        res.json(data);
    } catch (error) {
        console.error('Error reading quiz data:', error);
        res.status(500).json({ error: 'Failed to load quiz data' });
    }
});

// Upload topic file (JSON or TXT)
app.post('/api/upload-topic', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        const content = req.file.buffer.toString('utf-8');
        let quizData;
        let fileName;

        if (ext === '.json') {
            // Validate JSON structure
            try {
                quizData = JSON.parse(content);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid JSON file. Please check the file format.' });
            }

            if (!quizData.topic || !Array.isArray(quizData.questions)) {
                return res.status(400).json({
                    error: 'Invalid format. JSON must have "topic" (string) and "questions" (array) fields.'
                });
            }

            // Validate each question
            for (let i = 0; i < quizData.questions.length; i++) {
                const q = quizData.questions[i];
                if (!q.question || !Array.isArray(q.options) || q.correctIndex === undefined) {
                    return res.status(400).json({
                        error: `Question ${i + 1} is missing required fields (question, options, correctIndex).`
                    });
                }
                // Assign id if missing
                if (!q.id) q.id = i + 1;
                if (!q.explanation) q.explanation = '';
            }

            fileName = path.basename(req.file.originalname, '.json')
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '_');

        } else if (ext === '.txt') {
            const topicName = req.body.topicName ||
                path.basename(req.file.originalname, '.txt')
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());

            quizData = parseTxtToQuiz(content, topicName);

            if (quizData.questions.length === 0) {
                return res.status(400).json({
                    error: 'No valid questions found in TXT file. Use format: Q: question, A: opt, B: opt, C: opt, D: opt, Correct: A/B/C/D'
                });
            }

            fileName = path.basename(req.file.originalname, '.txt')
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '_');
        }

        // Save to data directory
        const savePath = path.join(DATA_DIR, `${fileName}.json`);
        await fs.writeFile(savePath, JSON.stringify(quizData, null, 4), 'utf-8');

        const meta = getTopicMeta(fileName);
        res.json({
            success: true,
            topic: {
                id: fileName,
                name: quizData.topic,
                icon: meta.icon,
                color: meta.color,
                questionCount: quizData.questions.length
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process uploaded file' });
    }
});

// Delete a topic
app.delete('/api/topic/:topicId', async (req, res) => {
    try {
        const { topicId } = req.params;
        // Prevent deleting built-in topics
        const builtIn = ['dbms', 'os', 'cn'];
        if (builtIn.includes(topicId)) {
            return res.status(403).json({ error: 'Cannot delete built-in topics' });
        }

        const filePath = path.join(DATA_DIR, `${topicId}.json`);
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: 'Topic not found' });
        }

        await fs.unlink(filePath);
        res.json({ success: true, message: `Topic "${topicId}" deleted successfully` });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete topic' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
