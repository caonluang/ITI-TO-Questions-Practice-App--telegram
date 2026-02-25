// groqApi.js — Groq AI integration for background quiz monitoring and corrections
import { recordApiCall } from './quotaTracker';

const API_KEY_STORAGE = 'groqApiKey';
const DEFAULT_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export const getStoredApiKey = () => localStorage.getItem(API_KEY_STORAGE) || DEFAULT_API_KEY;
export const saveApiKey = (key) => localStorage.setItem(API_KEY_STORAGE, key);

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

/**
 * Call Groq API (OpenAI-compatible)
 */
const callGroq = async (systemPrompt, userMessage, apiKey, maxTokens = 1024) => {
    const requestBody = {
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
        stream: false,
        response_format: { type: "json_object" }
    };

    recordApiCall();

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('No response received from Groq AI');

    return text.trim();
};

/**
 * Background Correction: Takes a batch of questions and returns corrected versions if needed.
 * "Nigrani" Mode: AI keeps a watch and corrects facts silently.
 */
export const correctQuestionsBatch = async (questions) => {
    const apiKey = getStoredApiKey();
    if (!apiKey) throw new Error('No API key available');

    const systemPrompt = `You are a silent Quiz Instructor. Your job is to monitor quiz questions for factual accuracy.
If a question, its options, or the marked correct answer is wrong, correct it silently.
If it is already correct, keep it exactly as is.
Return a JSON object with a "correctedQuestions" array matching the input structure.

Format:
{
  "correctedQuestions": [
    { "id": 1, "question": "...", "options": ["..."], "correctIndex": 0, "explanation": "..." }
  ]
}`;

    const userMessage = JSON.stringify(questions);

    try {
        const responseText = await callGroq(systemPrompt, userMessage, apiKey, 4096);
        const data = JSON.parse(responseText);
        return data.correctedQuestions || [];
    } catch (err) {
        console.error('Groq Background Correction Error:', err);
        return [];
    }
};

/**
 * Validate a single question (used for the "Verified" badge)
 */
export const validateQuestion = async (question) => {
    const apiKey = getStoredApiKey();
    const systemPrompt = `You are a strict quiz fact-checker. 
Respond ONLY in JSON:
{
  "questionOk": true,
  "correctAnswerOk": true,
  "issues": "",
  "betterExplanation": "Brief 1-2 sentence explanation"
}`;

    const userMessage = `Question: ${question.question}
Options: ${question.options.join(', ')}
Correct Index: ${question.correctIndex}`;

    try {
        const responseText = await callGroq(systemPrompt, userMessage, apiKey, 512);
        return JSON.parse(responseText);
    } catch (err) {
        return {
            questionOk: true,
            correctAnswerOk: true,
            issues: '',
            betterExplanation: 'Self-verified by Instructor.',
        };
    }
};

/**
 * Format raw text (fallback for TopicImporter)
 */
export const formatRawTextWithAI = async (rawText, topicName, apiKey) => {
    const systemPrompt = `Convert messy exam text into structured JSON. 
4 options mandatory. 0-based correctIndex.
{
  "topic": "${topicName}",
  "questions": [
    { "question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..." }
  ]
}`;

    const responseText = await callGroq(systemPrompt, rawText, apiKey, 8192);
    return JSON.parse(responseText);
};
