// Calculate session analytics
export const calculateAnalytics = (results) => {
    if (!results || results.length === 0) {
        return {
            total: 0,
            correct: 0,
            wrong: 0,
            notAttempted: 0,
            accuracy: 0,
            avgTime: 0,
            fastestTime: 0,
            slowestTime: 0,
        };
    }

    const total = results.length;
    const correct = results.filter(r => r.status === 'Correct').length;
    const wrong = results.filter(r => r.status === 'Wrong').length;
    const notAttempted = results.filter(r => r.status === 'Not Attempted').length;

    const attemptedResults = results.filter(r => r.status !== 'Not Attempted');
    const times = attemptedResults.map(r => r.timeTaken);

    const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;
    const avgTime = times.length > 0
        ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)
        : 0;
    const fastestTime = times.length > 0 ? Math.min(...times).toFixed(1) : 0;
    const slowestTime = times.length > 0 ? Math.max(...times).toFixed(1) : 0;

    return {
        total,
        correct,
        wrong,
        notAttempted,
        accuracy: Number.parseFloat(accuracy),
        avgTime: Number.parseFloat(avgTime),
        fastestTime: Number.parseFloat(fastestTime),
        slowestTime: Number.parseFloat(slowestTime),
    };
};

// Detect weak areas
export const detectWeakAreas = (results, questions) => {
    const topicStats = {};

    results.forEach((result) => {
        const question = questions.find(q => q.id === result.questionId);
        if (!question) return;

        // Extract topic from question or use default
        const topic = question.topic || 'General';

        if (!topicStats[topic]) {
            topicStats[topic] = { correct: 0, total: 0 };
        }

        topicStats[topic].total++;
        if (result.status === 'Correct') {
            topicStats[topic].correct++;
        }
    });

    const weakAreas = [];
    Object.entries(topicStats).forEach(([topic, stats]) => {
        const accuracy = (stats.correct / stats.total) * 100;
        if (accuracy < 60) {
            weakAreas.push({
                topic,
                accuracy: accuracy.toFixed(1),
                status: accuracy < 40 ? 'Very Weak' : 'Weak',
            });
        }
    });

    return weakAreas;
};

// Get performance trend
export const getPerformanceTrend = (results) => {
    const windowSize = 5;
    const trends = [];

    for (let i = 0; i < results.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const window = results.slice(start, i + 1);
        const correct = window.filter(r => r.status === 'Correct').length;
        const accuracy = (correct / window.length) * 100;
        trends.push({
            questionNumber: i + 1,
            rollingAccuracy: accuracy.toFixed(1),
        });
    }

    return trends;
};
