import React from 'react';
import PropTypes from 'prop-types';
import { useTelegram } from '../hooks/useTelegram';

const QuestionCard = ({
    question,
    selectedAnswer,
    onSelectAnswer,
    showAnswer,
    disabled,
    focusMode,
    highlightedOption
}) => {
    const { showHaptic } = useTelegram();

    const getOptionStyles = (index) => {
        const base = "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden active:scale-[0.98]";

        if (showAnswer) {
            if (index === question.correctIndex) {
                return `${base} border-green-500 bg-green-500/10 text-green-600 dark:text-green-400 font-bold`;
            } else if (index === selectedAnswer && index !== question.correctIndex) {
                return `${base} border-red-500 bg-red-500/10 text-red-600 dark:text-red-400`;
            }
            return `${base} border-transparent bg-tg-secondary opacity-60`;
        }

        if (index === selectedAnswer) {
            return `${base} border-tg-button bg-tg-button/5 text-tg-button font-bold`;
        }

        if (index === highlightedOption) {
            return `${base} border-tg-button/30 bg-tg-button/10`;
        }

        return `${base} border-transparent bg-tg-secondary hover:bg-tg-secondary/80`;
    };

    const handleSelect = (index) => {
        if (!disabled) {
            showHaptic('light');
            onSelectAnswer(index);
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className={`p-5 rounded-3xl bg-tg-secondary/50 backdrop-blur-sm border border-white/5 shadow-sm ${focusMode ? 'py-10' : ''}`}>
                <div className="flex items-start gap-3">
                    <span className="text-tg-button font-black text-xl leading-none pt-1">Q.</span>
                    <h2 className="text-lg md:text-xl font-bold leading-relaxed text-tg-text">
                        {question.question}
                    </h2>
                </div>

                {question.code && (
                    <div className="mt-6 rounded-xl overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-inner">
                        <div className="bg-white/5 px-4 py-2 flex items-center gap-2 border-b border-white/10">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                            </div>
                        </div>
                        <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-300 leading-relaxed">
                            <code>{question.code}</code>
                        </pre>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-3">
                {question.options.map((option, index) => (
                    <button
                        key={index}
                        className={getOptionStyles(index)}
                        onClick={() => handleSelect(index)}
                        disabled={disabled}
                    >
                        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-black text-sm border-2 transition-colors
                            ${selectedAnswer === index
                                ? 'bg-tg-button border-transparent text-tg-button-text'
                                : 'bg-tg-bg border-tg-button/20 text-tg-button'}`}>
                            {['A', 'B', 'C', 'D'][index]}
                        </div>
                        <span className="flex-1 text-base leading-tight">
                            {option}
                        </span>
                        {showAnswer && index === question.correctIndex && (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white scale-in duration-200">
                                ✓
                            </div>
                        )}
                        {showAnswer && index === selectedAnswer && index !== question.correctIndex && (
                            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white scale-in duration-200">
                                ✗
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

QuestionCard.propTypes = {
    question: PropTypes.shape({
        question: PropTypes.string.isRequired,
        options: PropTypes.arrayOf(PropTypes.string).isRequired,
        correctIndex: PropTypes.number.isRequired,
        code: PropTypes.string
    }).isRequired,
    selectedAnswer: PropTypes.number,
    onSelectAnswer: PropTypes.func.isRequired,
    showAnswer: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    focusMode: PropTypes.bool.isRequired,
    highlightedOption: PropTypes.number
};

export default QuestionCard;
