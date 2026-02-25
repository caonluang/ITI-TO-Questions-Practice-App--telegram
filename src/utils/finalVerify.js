
const normalizeText = (text) => {
    if (!text) return '';
    const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let inCodeFence = false;
    return rawLines.map(line => {
        const trimmed = line.trim();
        if (/^```/.test(trimmed)) { inCodeFence = !inCodeFence; return line; }
        if (inCodeFence) return line;
        let processed = line.trim().replace(/^\s*\*\*+\s*/, '').replace(/\s*\*+\s*$/, '').replace(/^\s*\*\*+(.*?)\*\*+\s*$/, '$1');
        if (!processed) return '';
        if (/^\s*(Q|Que)?[\s.:]*\d+[\s.:\-)]+/i.test(processed)) processed = processed.replace(/^\s*(Q|Que)?[\s.:]*\d+[\s.:\-)]+/i, 'Q: ').trim();
        else if (/^\s*\(?([A-D])\)?[\s.:\-]+/i.test(processed)) processed = processed.replace(/^\s*\(?([A-D])\)?[\s.:\-]+/i, '$1: ').trim();
        else if (/^\s*(Correct Answer|Correct|Answer|Ans|सही उत्तर)[\s.:\-]+/i.test(processed)) processed = processed.replace(/^\s*(Correct Answer|Correct|Answer|Ans|सही उत्तर)[\s.:\-]+/i, 'Correct: ').trim();
        else if (/^\s*(Explanation|व्याख्या)[\s.:\-]+/i.test(processed)) processed = processed.replace(/^\s*(Explanation|व्याख्या)[\s.:\-]+/i, 'Explanation: ').trim();
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
        const codeTokens = [/^\s*(def|import|class|public|static|void|const|let|var|if|else|for|while|return)\b/, /[=<>]{1,3}/, /\{\}/, /\[\]/, /;$/, /\(\)/, /\/\/|#/, /=>/];
        if (/^\s*[a-zA-Z_]\w*\s*=\s*.*$/.test(line)) return true;
        if (/^\s*(print|console\.log|System\.out\.print)\b/.test(line)) return true;
        return codeTokens.some(regex => regex.test(line));
    }

    const cleanMarkdown = (t) => {
        if (!t) return '';
        return t.trim().replace(/^\*\*+(.*?)\*\*+$/, '$1').replace(/\*\*/g, '').trim();
    };

    const pushIfValid = () => {
        if (current && current.question && current.options.length >= 2) {
            current.id = questionId++;
            current.question = cleanMarkdown(current.question);
            current.explanation = cleanMarkdown(current.explanation || 'Verified');
            current.code = (current.code || '').trim();
            questions.push({ ...current });
        }
    };

    let state = 'NONE';
    let inCodeFence = false;
    let activeOptionIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed && !inCodeFence) {
            if (state === 'QUESTION' && current) current.question += '\n';
            if (state === 'EXPLANATION' && current) current.explanation += '\n';
            continue;
        }
        if (trimmed.startsWith('```')) {
            inCodeFence = !inCodeFence;
            if (current) if (!current.code) current.code = '';
            continue;
        }
        if (inCodeFence && current) {
            current.code = (current.code || '') + line + '\n';
            continue;
        }
        if (line.startsWith('Q: ')) {
            pushIfValid();
            current = { question: line.substring(3).trim(), options: [], correctIndex: 0, explanation: '', code: '' };
            state = 'QUESTION';
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
            continue;
        }
        if (line.startsWith('Explanation: ') && current) {
            current.explanation = line.substring(13).trim();
            state = 'EXPLANATION';
            continue;
        }
        if (current) {
            if (state === 'QUESTION') {
                if (isLineCode(line)) current.code = (current.code || '') + line + '\n';
                else current.question += (current.question.endsWith('\n') ? '' : ' ') + line.trim();
            } else if (state === 'OPTIONS' && activeOptionIndex !== -1) {
                current.options[activeOptionIndex] += ' ' + line.trim();
            } else if (state === 'EXPLANATION') {
                current.explanation += (current.explanation.endsWith('\n') ? '' : ' ') + line.trim();
            }
        }
    }
    pushIfValid();
    return { questions };
};

const input = `Q: 1: निम्नलिखित कथनों के बाद output क्या होगा?**
\`\`\`python
m = {'Listen' : 'Music', 'Play' : 'Games'}
print(m.values())
\`\`\`
A: dict_keys(['Listen', 'Play'])
B: dict_values(['Music', 'Games'])
C: ['Music', 'Games']
D: Error
**Correct: B**
**Explanation:** **values() method dictionary की सभी values return करता है।** यहाँ values हैं 'Music' और 'Games', इसलिए output dict_values(['Music', 'Games']) होगी.`;

const result = parseTxtToQuiz(input, "Test");
const q = result.questions[0];
console.log("PASS:", q.code.includes('m.values()') && !q.explanation.includes('**'));
console.log("CODE:\n", q.code);
console.log("EXP:\n", q.explanation);
