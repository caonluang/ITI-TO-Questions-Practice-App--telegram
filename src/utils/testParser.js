
import { parseTxtToQuiz } from './topicStore.js';

const testCases = [
    {
        name: "User Example with Markdown and Code",
        input: `Q: 1: निम्नलिखित कथनों के बाद m का data type क्या होगा?**
\`\`\`python
true = "Honesty is the best policy"
m = true
\`\`\`
A: List
B: String
C: Dictionary
D: Boolean
**Correct: B**
**Explanation:** यहाँ \`true\` एक variable name है (Python keyword \`True\` नहीं), जिसमें string "Honesty is the best policy" assign है। m = true करने पर m में भी यही string आएगी, इसलिए data type String होगा.`,
        expectedTopic: "Test Topic",
        expectedCount: 1
    },
    {
        name: "Numbered Question with Period",
        input: `1. What is Python?
A. Snake
B. Language
C. Food
D. Car
Answer: B`,
        expectedCount: 1
    },
    {
        name: "Question with extra stars and space",
        input: `  ** Q. 2 : **  What is 2+2?
(A) 3
(B) 4
(C) 5
(D) 6
Correct: B`,
        expectedCount: 1
    }
];

function runTests() {
    console.log("Running Parser Tests...\n");
    let passed = 0;

    testCases.forEach(tc => {
        try {
            const result = parseTxtToQuiz(tc.input, tc.expectedTopic || "Test Topic");
            console.log(`Test: ${tc.name}`);
            console.log(`Questions found: ${result.questions.length}`);

            if (result.questions.length === tc.expectedCount) {
                console.log("✅ PASS");
                passed++;
                // Check first question details
                const q = result.questions[0];
                console.log(`Question text length: ${q.question.length}`);
                console.log(`Options count: ${q.options.length}`);
                console.log(`Correct Index: ${q.correctIndex}`);
                if (q.question.includes('```')) console.log("Code block preserved in question text.");
            } else {
                console.log("❌ FAIL: Expected " + tc.expectedCount + " but got " + result.questions.length);
                console.log(JSON.stringify(result, null, 2));
            }
            console.log("-----------------------------------\n");
        } catch (err) {
            console.error(`❌ ERROR in ${tc.name}:`, err);
        }
    });

    console.log(`Summary: ${passed}/${testCases.length} tests passed.`);
}

runTests();
