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
        let processed = line.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        if (!processed) return '';
        if (/^\s*(Q|Que)?[\s.:]*\d+[\s.:\-)]+/i.test(processed)) {
            processed = processed.replace(/^\s*(Q|Que)?[\s.:]*\d+[\s.:\-)]+/i, 'Q: ').trim();
        }
        else if (/^\s*\(?([A-D])\)?[\s.:\-]+/i.test(processed)) {
            processed = processed.replace(/^\s*\(?([A-D])\)?[\s.:\-]+/i, '$1: ').trim();
        }
        else if (/^\s*(Correct Answer|Correct|Answer|Ans|सही उत्तर)[\s.:\-]+/i.test(processed)) {
            processed = processed.replace(/^\s*(Correct Answer|Correct|Answer|Ans|सही उत्तर)[\s.:\-]+/i, 'Correct: ').trim();
        }
        else if (/^\s*(Explanation|व्याख्या)[\s.:\-]+/i.test(processed)) {
            processed = processed.replace(/^\s*(Explanation|व्याख्या)[\s.:\-]+/i, 'Explanation: ').trim();
        }
        return processed;
    }).join('\n');
};

const parseTxtToQuiz = (text, topicName) => {
    const normalized = normalizeText(text);
    const lines = normalized.split('\n');
    const questions = [];
    let current = null;
    let questionId = 1;
    const isLineCode = (line) => {
        const codeTokens = [
            /^\s*(def|import|class|public|static|void|const|let|var|if|else|for|while|return)\b/,
            /[=<>]{1,3}/, /\{\}/, /\[\]/, /;$/, /\(\)/, /\/\/|#/, /=>/
        ];
        return codeTokens.some(regex => regex.test(line));
    };
    const pushIfValid = () => {
        if (current && current.question && current.options.length >= 2) {
            current.id = questionId++;
            if (current.correctIndex === undefined) current.correctIndex = 0;
            if (!current.explanation) current.explanation = 'Verified by Quiz Engine.';
            questions.push({ ...current });
        }
    };
    let state = 'NONE';
    let activeOptionIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) {
            if ((state === 'QUESTION' || state === 'EXPLANATION') && current) {
                const field = state === 'QUESTION' ? 'question' : 'explanation';
                current[field] += '\n';
            }
            continue;
        }
        if (line.startsWith('Q: ')) {
            pushIfValid();
            current = { question: line.substring(3).trim(), options: [], correctIndex: undefined, explanation: '' };
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
                    if (!current.question.includes('```')) {
                        current.question += `\n\`\`\`python\n${line}\n\`\`\``;
                    } else {
                        current.question = current.question.replace(/```$/, `${line}\n\`\`\``);
                    }
                } else {
                    current.question += (current.question.endsWith('\n') ? '' : ' ') + trimmed;
                }
            } else if (state === 'OPTIONS' && activeOptionIndex !== -1) {
                current.options[activeOptionIndex] += ' ' + trimmed;
            } else if (state === 'EXPLANATION') {
                current.explanation += (current.explanation.endsWith('\n') ? '' : ' ') + trimmed;
            }
        }
    }
    pushIfValid();
    questions.forEach(q => {
        q.question = q.question.replace(/\n{3,}/g, '\n\n').trim();
        q.explanation = q.explanation.replace(/\n{3,}/g, '\n\n').trim();
        q.options = q.options.map(opt => opt.trim());
    });
    return { topic: topicName || 'Imported Topic', questions };
};

const input = `Q1. निम्नलिखित पायथन कोड को चलाने के बाद चर m का डेटा टाइप क्या होगा?

true = "Honesty is the best policy"
m = true

A. List
B. String
C. Dictionary
D. Boolean

Correct Answer: B
Explanation: यहाँ true एक variable name है (Python keyword True नहीं), जिसमें string "Honesty is the best policy" assign है। m = true करने पर m में भी यही string आएगी, इसलिए data type String होगा.`;

const result = parseTxtToQuiz(input, 'Test Topic');
console.log(JSON.stringify(result, null, 2));
