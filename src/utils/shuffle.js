// Fisher-Yates Shuffle Algorithm
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get questions by mode
export const getQuestionsByMode = (questions, mode, sessionHistory = []) => {
  switch (mode) {
    case 'sequential':
      return [...questions];
    
    case 'random':
      return shuffleArray(questions);
    
    case 'wrong-only':
      const wrongIds = sessionHistory
        .filter(h => h.status === 'Wrong')
        .map(h => h.questionId);
      return questions.filter(q => wrongIds.includes(q.id));
    
    case 'not-attempted':
      const notAttemptedIds = sessionHistory
        .filter(h => h.status === 'Not Attempted')
        .map(h => h.questionId);
      return questions.filter(q => notAttemptedIds.includes(q.id));
    
    default:
      return [...questions];
  }
};
