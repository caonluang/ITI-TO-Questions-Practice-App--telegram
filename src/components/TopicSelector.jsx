import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import TopicImporter from './TopicImporter';
import { getAllTopics, deleteTopic, isBuiltIn } from '../utils/topicStore';
import { getAllLogs } from '../utils/attemptLog';
// import './TopicSelector.css';
import { useTelegram } from '../hooks/useTelegram';

const TopicSelector = ({ onSelectTopic, sessionHistory }) => {
    const [selectedMode, setSelectedMode] = useState('sequential');
    const [topics, setTopics] = useState([]);
    const [attemptLogs, setAttemptLogs] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    const loadTopics = useCallback(async () => {
        const allTopics = await getAllTopics();
        setTopics(allTopics);
        setAttemptLogs(getAllLogs());
    }, []);

    useEffect(() => {
        loadTopics();
    }, [loadTopics]);

    const handleDeleteTopic = async (topicId, topicName) => {
        if (!globalThis.confirm(`Delete "${topicName}"? This cannot be undone.`)) return;

        const success = await deleteTopic(topicId);
        if (success) {
            loadTopics();
        } else {
            alert('Cannot delete built-in topics.');
        }
    };

    const modes = [
        { id: 'sequential', name: 'Sequential', icon: '📝', desc: 'Questions in order' },
        { id: 'random', name: 'Random', icon: '🎲', desc: 'Shuffled questions' },
        { id: 'wrong-only', name: 'Retry Wrong', icon: '🔄', desc: 'Only wrong answers', needsHistory: true },
        { id: 'not-attempted', name: 'Unattempted', icon: '⏭️', desc: 'Skipped questions', needsHistory: true },
    ];

    const hasHistory = sessionHistory && sessionHistory.length > 0;

    const filteredTopics = topics.filter(topic => 
        topic.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const { tg, user, showHaptic } = useTelegram();
    const [backendStatus, setBackendStatus] = useState('checking');

    useEffect(() => {
        fetch("http://127.0.0.1:8000/api/hello")
            .then(res => res.json())
            .then(() => setBackendStatus('online'))
            .catch(() => setBackendStatus('offline'));
    }, []);

    return (
        <div className="flex flex-col gap-6 p-4 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            {/* Premium Header */}
            <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-tg-button/30 shadow-lg shadow-tg-button/10">
                            {user?.photo_url ? (
                                <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-tg-button to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                                    {(user?.first_name?.[0] || 'U').toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-tg-bg rounded-full shadow-sm" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-sm font-black text-tg-text leading-none">
                                {user?.first_name || 'Associate'}
                            </h2>
                            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-[8px] font-black uppercase tracking-tighter rounded-md border border-yellow-500/30">
                                Premium
                            </span>
                        </div>
                        <span className="text-[10px] text-tg-hint font-bold uppercase tracking-widest mt-0.5 block opacity-70">
                            ITI TO Candidate
                        </span>
                    </div>
                </div>

                {/* Backend Status Pill */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-500 ${backendStatus === 'online' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                    backendStatus === 'offline' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                        'bg-tg-secondary border-white/5 text-tg-hint'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'online' ? 'bg-green-500 animate-pulse' :
                        backendStatus === 'offline' ? 'bg-red-500' : 'bg-tg-hint animate-bounce'
                        }`} />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                        {backendStatus === 'online' ? 'Cloud Live' : backendStatus === 'offline' ? 'Local Only' : 'Syncing'}
                    </span>
                </div>
            </div>

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-tg-button via-blue-600 to-indigo-700 p-8 text-white shadow-2xl shadow-tg-button/30">
                <div className="relative z-10">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest mb-4">
                        Training Center 2026
                    </span>
                    <h1 className="text-3xl font-black leading-tight mb-2 tracking-tighter">
                        Master Your<br />Skills.
                    </h1>
                    <p className="text-white/70 text-sm font-medium max-w-[200px]">
                        Professional preparation for ITI Training Officer exams.
                    </p>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-6xl opacity-20 pointer-events-none">🎓</div>
            </div>

            {/* Topic Importer Panel */}
            <div className="px-1">
                <TopicImporter onImportSuccess={loadTopics} />
            </div>

            {/* Search Bar */}
            <div className="px-2">
                <input 
                    type="text" 
                    placeholder="🔍 Search topics..." 
                    className="w-full p-4 rounded-2xl bg-tg-secondary/50 border border-white/5 focus:border-tg-button outline-none transition-all text-tg-text placeholder:text-tg-hint"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[11px] font-black text-tg-hint uppercase tracking-[0.2em]">📋 Practice Mode</h3>
                    {hasHistory && <span className="w-1.5 h-1.5 rounded-full bg-tg-button animate-pulse" />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {modes.map(mode => (
                        <button
                            key={mode.id}
                            className={`flex flex-col items-start p-5 rounded-3xl border-2 transition-all duration-300 text-left relative overflow-hidden group
                                ${selectedMode === mode.id
                                    ? 'border-tg-button bg-tg-button/10 shadow-lg shadow-tg-button/5'
                                    : 'border-white/5 bg-tg-secondary/50 backdrop-blur-sm hover:border-white/10'} 
                                ${mode.needsHistory && !hasHistory ? 'opacity-40 grayscale' : ''}`}
                            onClick={() => {
                                if (!mode.needsHistory || hasHistory) {
                                    showHaptic('selection');
                                    setSelectedMode(mode.id);
                                }
                            }}
                            disabled={mode.needsHistory && !hasHistory}
                        >
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-4 transition-transform group-active:scale-90 ${selectedMode === mode.id ? 'bg-tg-button text-white shadow-md' : 'bg-tg-bg/50'
                                }`}>
                                {mode.icon}
                            </div>
                            <span className="text-sm font-black text-tg-text mb-1 tracking-tight">{mode.name}</span>
                            <span className="text-[10px] text-tg-hint font-medium leading-relaxed">{mode.desc}</span>

                            {selectedMode === mode.id && (
                                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-tg-button" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[11px] font-black text-tg-hint uppercase tracking-[0.2em]">📚 Learning Path</h3>
                    <span className="text-[10px] font-bold text-tg-button">{filteredTopics.length} Topics</span>
                </div>
                <div className="space-y-4">
                    {filteredTopics.map((topic, index) => (
                        <div key={topic.id}
                            style={{ animationDelay: `${index * 100}ms` }}
                            className="group relative animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
                            <button
                                className="w-full h-24 flex items-center gap-5 p-5 bg-tg-secondary/40 backdrop-blur-sm rounded-[28px] border border-white/5 active:scale-[0.97] transition-all text-left shadow-sm hover:border-white/10 hover:bg-tg-secondary/60"
                                onClick={() => onSelectTopic(topic.id, selectedMode)}
                            >
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner relative overflow-hidden"
                                    style={{ backgroundColor: `${topic.color}15` }}>
                                    <span className="relative z-10">{topic.icon}</span>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-lg font-black text-tg-text block truncate tracking-tight">{topic.name}</span>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        {topic.questionCount !== undefined && (
                                            <span className="text-[10px] font-black text-tg-hint uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-md">
                                                {topic.questionCount} Questions
                                            </span>
                                        )}
                                        {attemptLogs[topic.id] && (
                                            <span className="text-[10px] font-black text-green-500/80 uppercase tracking-wider">
                                                {attemptLogs[topic.id].lastAttempt?.accuracy || 0}% Accuracy
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-tg-bg/50 flex items-center justify-center text-tg-button group-hover:bg-tg-button group-hover:text-white transition-all">
                                    <span className="text-xl font-black">→</span>
                                </div>
                            </button>
                            {!isBuiltIn(topic.id) && (
                                <button
                                    className="absolute -right-2 -top-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 active:scale-90 transition-all shadow-lg z-20"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTopic(topic.id, topic.name);
                                    }}
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {hasHistory && (
                <div className="mt-8 p-6 bg-tg-secondary/30 backdrop-blur-xl border border-white/5 rounded-[32px] shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform rotate-12">
                        <span className="text-6xl">📊</span>
                    </div>
                    <h3 className="text-[10px] font-black text-tg-hint uppercase tracking-widest mb-5 opacity-60">Last Session Performance</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-xl font-black text-green-500 mb-1">
                                {sessionHistory.filter(h => h.status === 'Correct').length}
                            </span>
                            <span className="text-[8px] font-black text-tg-hint uppercase tracking-tighter">Correct</span>
                        </div>
                        <div className="flex flex-col items-center border-x border-white/5">
                            <span className="text-xl font-black text-red-500 mb-1">
                                {sessionHistory.filter(h => h.status === 'Wrong').length}
                            </span>
                            <span className="text-[8px] font-black text-tg-hint uppercase tracking-tighter">Wrong</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xl font-black text-orange-500 mb-1">
                                {sessionHistory.filter(h => h.status === 'Not Attempted').length}
                            </span>
                            <span className="text-[8px] font-black text-tg-hint uppercase tracking-tighter text-center">Skipped</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

TopicSelector.propTypes = {
    onSelectTopic: PropTypes.func.isRequired,
    sessionHistory: PropTypes.array
};

export default TopicSelector;
