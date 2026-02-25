// attemptLog.js — Persistent per-topic attempt logging with revision keywords

const STORAGE_KEY = 'topicAttemptLogs';

// ---------- helpers ----------

const getLogs = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
};

const saveLogs = (logs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
};

/**
 * Extract main keywords from a question text.
 * Removes common stop words and returns the important terms.
 */
export const extractKeywords = (questionText) => {
    const stopWords = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
        'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
        'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
        'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
        'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
        'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
        'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
        'just', 'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this',
        'these', 'those', 'it', 'its', 'what', 'which', 'who', 'whom',
        'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'yours',
        'he', 'him', 'his', 'she', 'her', 'hers', 'they', 'them', 'their',
        'i', 'about', 'up', 'also', 'one', 'two', 'three', 'four',
        // Hindi common words
        'ka', 'ke', 'ki', 'ko', 'se', 'me', 'hai', 'hota', 'hoti', 'hote',
        'kya', 'kaun', 'kaise', 'kab', 'kahan', 'ye', 'wo', 'ya', 'aur',
        'par', 'mein', 'ek', 'yah', 'wah', 'jo', 'jab', 'tak', 'bhi',
        'nahi', 'nhi', 'kuch', 'sabhi', 'sab', 'bahut', 'jaise', 'liye',
        'like', 'following', 'among', 'called', 'known', 'used', 'using',
        'refers', 'refer', 'related', 'type', 'types', 'example',
    ]);

    // Remove question marks and special characters, split into words
    const words = questionText
        .replace(/[?!.,;:()\\[\\]{}"'`]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2)
        .filter(w => !stopWords.has(w.toLowerCase()));

    // Take unique keywords (max 5), prefer capitalized/longer words
    const seen = new Set();
    const keywords = [];
    for (const word of words) {
        const lower = word.toLowerCase();
        if (!seen.has(lower)) {
            seen.add(lower);
            keywords.push(word);
        }
        if (keywords.length >= 5) break;
    }

    return keywords;
};

/**
 * Save an attempt for a topic.
 * @param {string} topicId
 * @param {Array} results - array of { questionId, selectedAnswer, correct, timeTaken, status }
 * @param {Array} questions - array of question objects
 */
export const saveAttempt = (topicId, results, questions) => {
    const logs = getLogs();

    const correct = results.filter(r => r.status === 'Correct').length;
    const wrong = results.filter(r => r.status === 'Wrong').length;
    const skipped = results.filter(r => r.status === 'Not Attempted').length;
    const total = results.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Extract keywords from wrong/skipped questions
    const wrongQuestionIds = results
        .filter(r => r.status === 'Wrong' || r.status === 'Not Attempted')
        .map(r => r.questionId);

    const wrongQuestions = questions.filter(q => wrongQuestionIds.includes(q.id));
    const wrongKeywords = [];
    const seenKw = new Set();

    for (const q of wrongQuestions) {
        const kws = extractKeywords(q.question);
        for (const kw of kws) {
            const lower = kw.toLowerCase();
            if (!seenKw.has(lower)) {
                seenKw.add(lower);
                wrongKeywords.push(kw);
            }
        }
    }

    const attemptData = {
        date: new Date().toISOString(),
        total,
        correct,
        wrong,
        skipped,
        accuracy,
        wrongKeywords,
    };

    if (!logs[topicId]) {
        logs[topicId] = { attempts: 0, lastAttempt: null, history: [] };
    }

    logs[topicId].attempts += 1;
    logs[topicId].lastAttempt = attemptData;
    logs[topicId].history.push(attemptData);

    // Keep only last 20 attempts to avoid localStorage bloat
    if (logs[topicId].history.length > 20) {
        logs[topicId].history = logs[topicId].history.slice(-20);
    }

    saveLogs(logs);
    return logs[topicId];
};

/** Get attempt log for a specific topic */
export const getTopicLog = (topicId) => {
    const logs = getLogs();
    return logs[topicId] || null;
};

/** Get all attempt logs */
export const getAllLogs = () => getLogs();
