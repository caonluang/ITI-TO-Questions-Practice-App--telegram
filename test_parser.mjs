import { parseTxtToQuiz } from './src/utils/topicStore.js';

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
