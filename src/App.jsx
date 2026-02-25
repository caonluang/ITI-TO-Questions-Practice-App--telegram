import React, { useState, useEffect, useCallback } from 'react';
import TopicSelector from './components/TopicSelector';
import QuestionCard from './components/QuestionCard';
import Timer from './components/Timer';
import ExplanationPanel from './components/ExplanationPanel';
import ProgressBar from './components/ProgressBar';
import SessionSummary from './components/SessionSummary';
import QuotaWidget from './components/QuotaWidget';
import { useTimer } from './hooks/useTimer';
import { useTelegram } from './hooks/useTelegram';
import { getQuestionsByMode } from './utils/shuffle';
import { getQuizData } from './utils/topicStore';
import { saveAttempt } from './utils/attemptLog';
import { correctQuestionsBatch } from './utils/groqApi';

// import './App.css';

const TIMER_DURATION = 15; // 15 seconds per question

function App() {
  const { tg, user, showHaptic, isDark } = useTelegram();

  // State management
  const [screen, setScreen] = useState('home'); // home, quiz, result
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [quizMode, setQuizMode] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [results, setResults] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [highlightedOption, setHighlightedOption] = useState(null);

  // Current question (declared early so hooks can reference it)
  const currentQuestion = questions[currentIndex];

  // Load session history + quiz state from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('quizSessionHistory');
    if (savedHistory) {
      try { setSessionHistory(JSON.parse(savedHistory)); } catch { }
    }

    const restoreState = async () => {
      const savedState = localStorage.getItem('quizActiveState');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.screen === 'quiz' && state.topicId) {
            const data = await getQuizData(state.topicId);
            if (data) {
              setScreen('quiz');
              setSelectedTopic(data.topic);
              setSelectedTopicId(state.topicId);
              setQuizMode(state.mode || null);
              setQuestions(state.questions || data.questions);
              setCurrentIndex(state.currentIndex || 0);
              setResults(state.results || []);
              setStartTime(state.startTime || Date.now());
            }
          }
        } catch { }
      }
    };
    restoreState();
  }, []);

  // Save session history to localStorage
  useEffect(() => {
    if (results.length > 0) {
      localStorage.setItem('quizSessionHistory', JSON.stringify(results));
    }
  }, [results]);

  // Save active quiz state to localStorage whenever it changes
  useEffect(() => {
    if (screen === 'quiz' && selectedTopicId) {
      const state = {
        screen,
        topicId: selectedTopicId,
        mode: quizMode,
        questions,
        currentIndex,
        results,
        startTime,
      };
      localStorage.setItem('quizActiveState', JSON.stringify(state));
    } else if (screen === 'home') {
      localStorage.removeItem('quizActiveState');
    }
  }, [screen, selectedTopicId, quizMode, questions, currentIndex, results, startTime]);

  // --- Groq Background Instructor (Nigrani) Service ---
  useEffect(() => {
    if (screen !== 'quiz' || questions.length === 0) return;

    // Monitor questions and correct them in background
    // We only correct once per set of questions to avoid loops
    const checkAndCorrect = async () => {
      const unverifiedQuestions = questions.filter(q => !q.verifiedByGroq);
      if (unverifiedQuestions.length === 0) return;

      // Process in chunks of 5 to be responsive and quota-friendly
      const batch = unverifiedQuestions.slice(0, 5);
      const correctedBatch = await correctQuestionsBatch(batch);

      if (correctedBatch.length > 0) {
        setQuestions(prev => {
          const newQuestions = [...prev];
          correctedBatch.forEach(correctedQ => {
            const idx = newQuestions.findIndex(q => q.id === correctedQ.id);
            if (idx !== -1) {
              newQuestions[idx] = { ...correctedQ, verifiedByGroq: true };
            }
          });
          return newQuestions;
        });
      }
    };

    const timer = setTimeout(checkAndCorrect, 2000); // Start check after 2s of being in quiz
    return () => clearTimeout(timer);
  }, [screen, questions]);


  // Timer timeout handler
  const handleTimeout = useCallback(() => {
    if (!showExplanation && screen === 'quiz') {
      const currentQuestion = questions[currentIndex];
      const newResult = {
        questionId: currentQuestion.id,
        selectedAnswer: null,
        correct: false,
        timeTaken: TIMER_DURATION,
        status: 'Not Attempted',
      };
      setResults(prev => [...prev, newResult]);
      setShowExplanation(true);
    }
  }, [showExplanation, screen, questions, currentIndex]);

  const { timeLeft, isRunning, isPaused, start, stop, pause, resume, getElapsedTime } = useTimer(
    TIMER_DURATION,
    handleTimeout
  );

  // Pause/Resume toggle
  const handlePauseResume = () => {
    if (isPaused) {
      resume();
    } else if (isRunning) {
      pause();
    }
  };

  // Refresh — reload quiz data for the current topic without full page reload
  const handleRefresh = async () => {
    if (!selectedTopicId) return;

    const data = await getQuizData(selectedTopicId);
    if (!data) return;

    // Get new questions list
    const newQuestions = quizMode
      ? getQuestionsByMode(data.questions, quizMode, sessionHistory)
      : data.questions;

    // Keep current progress: merge new questions (any newly added ones appear at the end)
    const existingIds = new Set(questions.map(q => q.id));
    const addedQuestions = newQuestions.filter(q => !existingIds.has(q.id));

    if (addedQuestions.length > 0) {
      setQuestions(prev => [...prev, ...addedQuestions]);
      alert(`🔄 ${addedQuestions.length} new question(s) loaded!`);
    } else {
      alert('🔄 Data refreshed — no new questions found.');
    }
  };

  // Navigate to previous question (without answering current)
  const handlePrev = () => {
    if (currentIndex > 0) {
      stop();
      setCurrentIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setHighlightedOption(null);
      start();
    }
  };

  // Skip to next question without answering
  const handleSkip = () => {
    if (currentIndex + 1 >= questions.length) {
      saveAttempt(selectedTopicId, results, questions);
      setScreen('result');
      setSessionHistory(results);
    } else {
      stop();
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setHighlightedOption(null);
      start();
    }
  };

  // Jump to a specific question number
  const handleJumpTo = (num) => {
    const idx = num - 1;
    if (idx >= 0 && idx < questions.length && idx !== currentIndex) {
      stop();
      setCurrentIndex(idx);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setHighlightedOption(null);
      start();
    }
  };

  // Start quiz — loads data from MongoDB
  const handleSelectTopic = async (topicId, mode) => {
    const data = await getQuizData(topicId);

    if (!data) {
      alert('Topic not found!');
      return;
    }

    const processedQuestions = getQuestionsByMode(data.questions, mode, sessionHistory);

    if (processedQuestions.length === 0) {
      alert('No questions available for this mode!');
      return;
    }

    setSelectedTopic(data.topic);
    setSelectedTopicId(topicId);
    setQuizMode(mode);
    setQuestions(processedQuestions);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setResults([]);
    setStartTime(Date.now());
    setScreen('quiz');

    // Start timer after a brief delay
    setTimeout(() => start(), 100);
  };

  // Handle answer selection
  const handleSelectAnswer = (answerIndex) => {
    if (showExplanation || selectedAnswer !== null) return;

    stop();
    const timeTaken = getElapsedTime();
    const currentQuestion = questions[currentIndex];
    const isCorrect = answerIndex === currentQuestion.correctIndex;

    const newResult = {
      questionId: currentQuestion.id,
      selectedAnswer: answerIndex,
      correct: isCorrect,
      timeTaken,
      status: isCorrect ? 'Correct' : 'Wrong',
    };

    setSelectedAnswer(answerIndex);
    setResults(prev => [...prev, newResult]);
    setShowExplanation(true);
  };

  // Move to next question
  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      saveAttempt(selectedTopicId, results, questions);
      setScreen('result');
      setSessionHistory(results);
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setHighlightedOption(null);
      start();
    }
  };

  // Restart quiz
  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setResults([]);
    setStartTime(Date.now());
    setScreen('quiz');
    setTimeout(() => start(), 100);
  };

  // Retry wrong questions
  const handleRetryWrong = () => {
    const wrongOrSkipped = results.filter(
      r => r.status === 'Wrong' || r.status === 'Not Attempted'
    );
    const wrongIds = wrongOrSkipped.map(r => r.questionId);
    const retryQuestions = questions.filter(q => wrongIds.includes(q.id));

    setQuestions(retryQuestions);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setResults([]);
    setStartTime(Date.now());
    setScreen('quiz');
    setTimeout(() => start(), 100);
  };

  // Go to home
  const handleGoHome = () => {
    showHaptic('light');
    setScreen('home');
    stop();
  };

  // Handle early quiz submission
  const handleSubmitQuiz = () => {
    if (results.length === 0) return;
    if (window.confirm('Are you sure you want to submit the quiz now?')) {
      stop();
      saveAttempt(selectedTopicId, results, questions);
      setScreen('result');
      setSessionHistory(results);
    }
  };

  // Keyboard shortcuts for quiz screen
  useEffect(() => {
    if (screen !== 'quiz') return;

    const handleKeyDown = (e) => {
      // Don't capture keys when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const optionsCount = currentQuestion?.options?.length || 4;

      switch (e.key) {
        case ' ': // Spacebar — pause/resume
          e.preventDefault();
          if (!showExplanation) handlePauseResume();
          break;

        case 'ArrowLeft': // Previous question
          e.preventDefault();
          handlePrev();
          break;

        case 'ArrowRight': // Next / Skip question
          e.preventDefault();
          if (showExplanation) {
            handleNext();
          } else {
            handleSkip();
          }
          break;

        case 'ArrowUp': // Highlight previous option
          e.preventDefault();
          if (!showExplanation && selectedAnswer === null) {
            setHighlightedOption(prev =>
              prev === null || prev <= 0 ? optionsCount - 1 : prev - 1
            );
          }
          break;

        case 'ArrowDown': // Highlight next option
          e.preventDefault();
          if (!showExplanation && selectedAnswer === null) {
            setHighlightedOption(prev =>
              prev === null || prev >= optionsCount - 1 ? 0 : prev + 1
            );
          }
          break;

        case 'Enter': // Confirm highlighted option
          e.preventDefault();
          if (highlightedOption !== null && !showExplanation && selectedAnswer === null) {
            handleSelectAnswer(highlightedOption);
          } else if (showExplanation) {
            handleNext();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, showExplanation, selectedAnswer, highlightedOption, currentQuestion, isPaused, isRunning]);


  return (
    <div className={`min-h-screen bg-tg-bg text-tg-text font-sans ${isDark ? 'dark' : ''}`}>
      <div className="max-w-md mx-auto relative min-h-screen flex flex-col">
        {screen === 'home' && (
          <TopicSelector
            onSelectTopic={handleSelectTopic}
            sessionHistory={sessionHistory}
          />
        )}

        {screen === 'quiz' && currentQuestion && (
          <div className="flex-1 flex flex-col p-4 animate-in fade-in duration-500">
            {/* Modern Telegram Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                className="w-10 h-10 flex items-center justify-center bg-tg-secondary rounded-full active:scale-95 transition-all text-lg"
                onClick={() => { showHaptic('light'); handleGoHome(); }}
                disabled={focusMode}
              >
                ✕
              </button>
              <div className="flex flex-col items-center">
                <h2 className="text-sm font-bold truncate max-w-[150px]">{selectedTopic}</h2>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-tg-hint uppercase tracking-tighter font-medium">Live Session</span>
                </div>
              </div>
              <button
                className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-all text-lg ${isPaused ? 'bg-tg-button text-white animate-pulse' : 'bg-tg-secondary'}`}
                onClick={() => { showHaptic('selection'); handlePauseResume(); }}
                disabled={showExplanation}
              >
                {isPaused ? '▶' : '||'}
              </button>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <ProgressBar
                  current={currentIndex + 1}
                  total={questions.length}
                  results={results}
                />
              </div>

              <div className="relative mb-6 flex justify-center">
                <Timer timeLeft={timeLeft} maxTime={TIMER_DURATION} isPaused={isPaused} />

                <button
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-tg-hint hover:text-tg-button transition-colors"
                  onClick={handleRefresh}
                  title="Refresh data"
                >
                  <span className="text-xl italic">🔄</span>
                </button>
              </div>

              <div className="flex-1">
                <QuestionCard
                  question={currentQuestion}
                  selectedAnswer={selectedAnswer}
                  onSelectAnswer={handleSelectAnswer}
                  showAnswer={showExplanation}
                  disabled={showExplanation || isPaused}
                  focusMode={focusMode}
                  highlightedOption={highlightedOption}
                />
              </div>
            </div>

            {/* Premium Sticky Navigation */}
            <div className="sticky bottom-0 left-0 right-0 p-4 -mx-4 bg-gradient-to-t from-tg-bg via-tg-bg to-transparent">
              <div className="flex gap-3">
                <button
                  className="flex-1 py-4 bg-tg-secondary font-bold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-30"
                  onClick={() => { showHaptic('light'); handlePrev(); }}
                  disabled={currentIndex === 0 || showExplanation}
                >
                  ← Back
                </button>

                {!showExplanation ? (
                  <button
                    className="flex-[2] py-4 bg-tg-button text-tg-button-text font-black rounded-2xl shadow-lg active:scale-[0.98] transition-all"
                    onClick={() => { showHaptic('medium'); handleSkip(); }}
                  >
                    Skip & Next →
                  </button>
                ) : (
                  <button
                    className="flex-[2] py-4 bg-tg-button text-tg-button-text font-black rounded-2xl shadow-lg active:scale-[0.98] transition-all animate-bounce"
                    onClick={() => { showHaptic('impact'); handleNext(); }}
                  >
                    Continue →
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 px-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-tg-hint uppercase">Jump:</span>
                  <input
                    type="number"
                    className="w-12 h-8 bg-tg-secondary border-none rounded-lg text-xs text-center font-bold focus:ring-1 focus:ring-tg-button"
                    min={1}
                    max={questions.length}
                    placeholder={currentIndex + 1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        showHaptic('selection');
                        handleJumpTo(parseInt(e.target.value, 10));
                        e.target.value = '';
                      }
                    }}
                    disabled={showExplanation}
                  />
                </div>

                {!showExplanation && results.length > 0 && (
                  <button
                    className="text-xs font-bold text-tg-hint hover:text-red-500 transition-colors"
                    onClick={() => { showHaptic('warning'); handleSubmitQuiz(); }}
                  >
                    Finish & Submit
                  </button>
                )}

                <label className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded-full accent-tg-button"
                    checked={focusMode}
                    onChange={(e) => { showHaptic('selection'); setFocusMode(e.target.checked); }}
                  />
                  <span className="text-[10px] uppercase font-black text-tg-hint tracking-wider">Zen</span>
                </label>
              </div>
            </div>

            {showExplanation && (
              <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none p-4">
                <div className="pointer-events-auto max-w-md mx-auto w-full">
                  <ExplanationPanel
                    question={currentQuestion}
                    selectedAnswer={selectedAnswer}
                    status={results[results.length - 1]?.status}
                    timeTaken={results[results.length - 1]?.timeTaken || 0}
                    onNext={handleNext}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {screen === 'result' && (
          <SessionSummary
            results={results}
            questions={questions}
            topic={selectedTopic}
            topicId={selectedTopicId}
            startTime={startTime}
            onRestart={handleRestart}
            onRetryWrong={handleRetryWrong}
            onGoHome={handleGoHome}
          />
        )}
      </div>
    </div>
  );
}

export default App;
