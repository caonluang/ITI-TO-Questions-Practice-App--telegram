import dbmsData from '../data/dbms.json';
import osData from '../data/os.json';
import cnData from '../data/cn.json';
import ioDevicesData from '../data/io_devices.json';
import computerGkData from '../data/computer_gk.json';
import computerFundamentalsData from '../data/computer_fundamentals.json';
import hardwarePeripheralsData from '../data/hardware_peripherals.json';

const API_BASE = '/api';
const STORAGE_KEY = 'customTopics';

// Built-in topics bundled with the app
const BUILT_IN_MAP = {
    dbms: { data: dbmsData, icon: '🗄️', color: '#667eea' },
    os: { data: osData, icon: '💻', color: '#11998e' },
    cn: { data: cnData, icon: '🌐', color: '#ee0979' },
    io_devices: { data: ioDevicesData, icon: '🖨️', color: '#f7971e' },
    computer_gk: { data: computerGkData, icon: '🧠', color: '#8e2de2' },
    computer_fundamentals: { data: computerFundamentalsData, icon: '📚', color: '#00b09b' },
    hardware_peripherals: { data: hardwarePeripheralsData, icon: '🔧', color: '#fc4a1a' },
};

const getCustomTopicsLocal = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
};

const getTopicMetaLocal = (id) => {
    const icons = ['📚', '📝', '🧠', '💡', '🔬', '📐', '🎓', '📖'];
    const colors = ['#ff9800', '#9c27b0', '#795548', '#607d8b', '#00bcd4', '#e91e63', '#4caf50', '#ff5722'];
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return { icon: icons[hash % icons.length], color: colors[hash % colors.length] };
};

// ---------- public API ----------

/** Get topic list (Hybrid: MongoDB + Local Fallback) */
export const getAllTopics = async () => {
    const topics = [];

    // 1. Add Built-in topics (always available)
    for (const [id, { data, icon, color }] of Object.entries(BUILT_IN_MAP)) {
        topics.push({
            id,
            name: data.topic,
            icon,
            color,
            questionCount: data.questions ? data.questions.length : 0,
        });
    }

    // 2. Add Custom topics from localStorage (user's "purane swal")
    const customLocal = getCustomTopicsLocal();
    for (const [id, data] of Object.entries(customLocal)) {
        // Avoid duplicate IDs if already in built-in
        if (BUILT_IN_MAP[id]) continue;

        const meta = getTopicMetaLocal(id);
        topics.push({
            id,
            name: data.topic,
            icon: meta.icon,
            color: meta.color,
            questionCount: data.questions ? data.questions.length : 0,
        });
    }

    // 3. Add topics from MongoDB (if available)
    try {
        const response = await fetch(`${API_BASE}/topics`);
        if (response.ok) {
            const remoteTopics = await response.json();
            // Merge remote topics, avoiding duplicates with local ones
            remoteTopics.forEach(remote => {
                if (!topics.find(t => t.id === remote.id)) {
                    topics.push(remote);
                }
            });
        }
    } catch (error) {
        console.warn('MongoDB connection unavailable, using local data only.');
    }

    return topics;
};

/** Get full quiz data for a topic (Hybrid: MongoDB + Local Fallback) */
export const getQuizData = async (topicId) => {
    // 1. Check Built-in topics
    if (BUILT_IN_MAP[topicId]) {
        return BUILT_IN_MAP[topicId].data;
    }

    // 2. Check Custom topics from localStorage
    const localTopics = getCustomTopicsLocal();
    if (localTopics[topicId]) {
        return localTopics[topicId];
    }

    // 3. Try MongoDB
    try {
        const response = await fetch(`${API_BASE}/topics/${topicId}`);
        if (response.ok) return await response.json();
    } catch (error) {
        console.warn('MongoDB fetch error for topic:', topicId);
    }
    return null;
};

/** Add a new topic (Hybrid: MongoDB + Local Fallback) */
export const addTopic = async (topicData, originalFileName, rawContent) => {
    const topicId = (topicData.topic || 'Untitled').toLowerCase().replace(/\s+/g, '_');

    // 1. Try MongoDB
    try {
        const response = await fetch(`${API_BASE}/topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...topicData, id: topicId })
        });
        if (response.ok) return await response.json();
    } catch (e) {
        console.warn('MongoDB unavailable, saving to localStorage.');
    }

    // 2. Fallback to localStorage
    const localTopics = getCustomTopicsLocal();
    localTopics[topicId] = topicData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localTopics));
    return { ...topicData, id: topicId };
};

/** Delete a custom topic */
export const deleteTopic = async (topicId) => {
    if (isBuiltIn(topicId)) return false;

    // 1. Try MongoDB
    try {
        const response = await fetch(`${API_BASE}/topics/${topicId}`, {
            method: 'DELETE'
        });
        if (response.ok) return true;
    } catch (e) {
        console.warn('MongoDB delete failed, checking local.');
    }

    // 2. Fallback to localStorage
    const localTopics = getCustomTopicsLocal();
    if (localTopics[topicId]) {
        delete localTopics[topicId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localTopics));
        return true;
    }
    return false;
};

/** Check if a topic is built-in (for UI purposes) */
export const isBuiltIn = (topicId) => BUILT_IN_MAP.hasOwnProperty(topicId);

// ---------- Flexible TXT parser ----------

/**
 * Rule 1: Pre-processing.
 * Normalize common text formats and noise.
 */
const normalizeText = (text) => {
    if (!text) return '';
    const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let inCodeFence = false;

    return rawLines.map(line => {
        const trimmed = line.trim();
        if (/^```/.test(trimmed)) {
            inCodeFence = !inCodeFence;
            return line;
        }
        if (inCodeFence) return line;

        // Strip noise: ** prefixes or suffixes
        let processed = line.trim()
            .replace(/^\s*\*\*+\s*/, '')
            .replace(/\s*\*+\s*$/, '')
            .replace(/^\s*\*\*+(.*?)\*\*+\s*$/, '$1');

        if (!processed) return '';

        // Capture and normalize prefixes
        if (/^\s*(Q|Que)?[\s.:]*\d+[\s.:\-)]+/i.test(processed)) {
            processed = processed.replace(/^\s*(Q|Que)?[\s.:]*\d+[\s.:\-)]+/i, 'Q: ').trim();
        } else if (/^\s*\(?([A-D])\)?[\s.:\-]+/i.test(processed)) {
            processed = processed.replace(/^\s*\(?([A-D])\)?[\s.:\-]+/i, '$1: ').trim();
        } else if (/^\s*(Correct Answer|Correct|Answer|Ans|सही उत्तर)[\s.:\-]+/i.test(processed)) {
            processed = processed.replace(/^\s*(Correct Answer|Correct|Answer|Ans|सही उत्तर)[\s.:\-]+/i, 'Correct: ').trim();
        } else if (/^\s*(Explanation|व्याख्या)[\s.:\-]+/i.test(processed)) {
            processed = processed.replace(/^\s*(Explanation|व्याख्या)[\s.:\-]+/i, 'Explanation: ').trim();
        }

        return processed;
    }).join('\n');
};

/**
 * Rule 2, 3 & 4: Smart MCQ Parser.
 */
export const parseTxtToQuiz = (text, topicName) => {
    const normalized = normalizeText(text);
    const lines = normalized.split('\n');
    const questions = [];
    let current = null;
    let questionId = 1;

    const isLineCode = (line) => {
        const codeTokens = [/^\s*(def|import|class|public|static|void|const|let|var|if|else|for|while|return)\b/, /[=<>]{1,3}/, /\{\}/, /\[\]/, /;$/, /\(\)/, /\/\/|#/, /=>/];
        if (/^\s*[a-zA-Z_]\w*\s*=\s*.*$/.test(line)) return true;
        if (/^\s*(print|console\.log|System\.out\.print)\b/.test(line)) return true;
        return codeTokens.some(regex => regex.test(line));
    };

    const cleanMarkdown = (t) => {
        if (!t) return '';
        return t.trim()
            .replace(/^\*\*+(.*?)\*\*+$/, '$1') // Strip wrapping **
            .replace(/\*\*/g, '')              // Strip all other **
            .trim();
    };

    const pushIfValid = () => {
        if (current && current.question && current.options.length >= 2) {
            current.id = questionId++;
            if (current.correctIndex === undefined) current.correctIndex = 0;

            // Final cleanup
            current.question = cleanMarkdown(current.question);
            current.explanation = cleanMarkdown(current.explanation || 'Verified by Quiz Engine.');
            if (current.code) current.code = current.code.trim();

            questions.push({ ...current });
        }
    };

    let state = 'NONE';
    let activeOptionIndex = -1;
    let inCodeFence = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed && !inCodeFence) {
            if (state === 'QUESTION' && current) current.question += '\n';
            if (state === 'EXPLANATION' && current) current.explanation += '\n';
            continue;
        }

        // Handle explicit code fences
        if (trimmed.startsWith('```')) {
            inCodeFence = !inCodeFence;
            if (current) {
                if (!current.code) current.code = '';
                // Don't add the fence itself to the code field
            }
            continue;
        }

        if (inCodeFence && current) {
            current.code = (current.code || '') + line + '\n';
            continue;
        }

        if (line.startsWith('Q: ')) {
            pushIfValid();
            current = { question: line.substring(3).trim(), options: [], correctIndex: undefined, explanation: '', code: '' };
            state = 'QUESTION';
            activeOptionIndex = -1;
            continue;
        }

        const optionMatch = line.match(/^([A-D]):\s*(.*)$/i);
        if (optionMatch && current) {
            current.options.push(optionMatch[2].trim());
            state = 'OPTIONS';
            activeOptionIndex = current.options.length - 1;
            continue;
        }

        const correctMatch = line.match(/^Correct:\s*([A-D])\b/i);
        if (correctMatch && current) {
            current.correctIndex = ['A', 'B', 'C', 'D'].indexOf(correctMatch[1].toUpperCase());
            state = 'METADATA';
            activeOptionIndex = -1;
            continue;
        }

        if (line.startsWith('Explanation: ') && current) {
            current.explanation = line.substring(13).trim();
            state = 'EXPLANATION';
            activeOptionIndex = -1;
            continue;
        }

        if (current) {
            if (state === 'QUESTION') {
                if (isLineCode(line)) {
                    current.code = (current.code || '') + line + '\n';
                } else {
                    current.question += (current.question.endsWith('\n') ? '' : ' ') + line.trim();
                }
            } else if (state === 'OPTIONS' && activeOptionIndex !== -1) {
                current.options[activeOptionIndex] += ' ' + line.trim();
            } else if (state === 'EXPLANATION') {
                current.explanation += (current.explanation.endsWith('\n') ? '' : ' ') + line.trim();
            }
        }
    }

    pushIfValid();
    return { topic: topicName || 'Imported Topic', questions };
};
