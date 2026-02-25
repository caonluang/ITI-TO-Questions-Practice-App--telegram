import React, { useState, useRef } from 'react';
import { addTopic, parseTxtToQuiz } from '../utils/topicStore';
// import './TopicImporter.css';

const TopicImporter = ({ onImportSuccess }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(null);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const validateAndPreview = (file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'json' && ext !== 'txt') {
            setStatus({ type: 'error', message: '❌ Only .json and .txt files are supported!' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            try {
                if (ext === 'json') {
                    const data = JSON.parse(content);
                    setPreview({
                        file,
                        content,
                        type: 'json',
                        topicName: data.topic || 'Unknown Topic',
                        questionCount: data.questions ? data.questions.length : 0,
                        valid: !!(data.topic && Array.isArray(data.questions))
                    });
                } else {
                    const lines = content.split('\n');
                    const qCount = lines.filter(l => /^Q:/i.test(l.trim())).length;
                    setPreview({
                        file,
                        content,
                        type: 'txt',
                        topicName: file.name.replace('.txt', '').replace(/_/g, ' '),
                        questionCount: qCount,
                        valid: qCount > 0
                    });
                }
                setStatus(null);
            } catch (err) {
                setStatus({ type: 'error', message: '❌ Invalid file content. Please check the format.' });
                setPreview(null);
            }
        };
        reader.readAsText(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndPreview(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            validateAndPreview(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!preview || !preview.file) return;

        setUploading(true);
        setStatus(null);

        try {
            let quizData;

            if (preview.type === 'json') {
                quizData = JSON.parse(preview.content);

                if (!quizData.topic || !Array.isArray(quizData.questions)) {
                    setStatus({ type: 'error', message: '❌ Invalid format. JSON must have "topic" and "questions" fields.' });
                    setUploading(false);
                    return;
                }

                for (let i = 0; i < quizData.questions.length; i++) {
                    const q = quizData.questions[i];
                    if (!q.question || !Array.isArray(q.options) || q.correctIndex === undefined) {
                        setStatus({ type: 'error', message: `❌ Question ${i + 1} is missing required fields.` });
                        setUploading(false);
                        return;
                    }
                }
            } else {
                const topicName = preview.file.name
                    .replace('.txt', '')
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
                quizData = parseTxtToQuiz(preview.content, topicName);

                if (quizData.questions.length === 0) {
                    setStatus({ type: 'error', message: '❌ No valid questions found in TXT file.' });
                    setUploading(false);
                    return;
                }
            }

            const result = await addTopic(quizData, preview.file.name, preview.type === 'txt' ? preview.content : null);

            setStatus({
                type: 'success',
                message: `✅ Topic imported successfully!`
            });
            setPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (onImportSuccess) onImportSuccess();
        } catch (err) {
            setStatus({ type: 'error', message: `❌ Import failed: ${err.message}` });
        } finally {
            setUploading(false);
        }
    };

    const clearPreview = () => {
        setPreview(null);
        setStatus(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };



    return (
        <div className="topic-importer">
            <button
                className={`importer-toggle ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="toggle-icon">{isOpen ? '✕' : '📥'}</span>
                <span>{isOpen ? 'Close Panel' : 'Import Topic'}</span>
            </button>

            {isOpen && (
                <div className="importer-panel">
                    <>
                        <div className="panel-header">
                            <h3>📂 Import Quiz Topic</h3>
                            <p>Upload a <strong>.json</strong> or <strong>.txt</strong> file to add a new topic</p>
                        </div>

                        <div
                            className={`drop-zone ${dragActive ? 'active' : ''} ${preview ? 'has-file' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => !preview && fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,.txt"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />

                            {!preview ? (
                                <div className="drop-content">
                                    <div className="drop-icon">📄</div>
                                    <p className="drop-text">Drag & drop your file here</p>
                                    <p className="drop-subtext">or click to browse</p>
                                    <div className="supported-formats">
                                        <span className="format-badge json">JSON</span>
                                        <span className="format-badge txt">TXT</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="file-preview">
                                    <div className={`preview-icon ${preview.type}`}>
                                        {preview.type === 'json' ? '{ }' : 'Aa'}
                                    </div>
                                    <div className="preview-info">
                                        <h4>{preview.topicName}</h4>
                                        <p>{preview.questionCount} questions found · {preview.type.toUpperCase()} file</p>
                                        {!preview.valid && (
                                            <p className="preview-warning">⚠️ File format may be invalid</p>
                                        )}
                                    </div>
                                    <button className="clear-btn" onClick={(e) => { e.stopPropagation(); clearPreview(); }}>✕</button>
                                </div>
                            )}
                        </div>

                        {preview && (
                            <button
                                className={`upload-btn ${uploading ? 'uploading' : ''}`}
                                onClick={handleUpload}
                                disabled={uploading || !preview.valid}
                            >
                                {uploading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Importing...
                                    </>
                                ) : (
                                    <>📥 Import to Quiz Engine</>
                                )}
                            </button>
                        )}
                    </>

                    {/* Status message */}
                    {status && (
                        <div className={`status-msg ${status.type}`}>
                            {status.message}
                        </div>
                    )}

                    {/* Format help */}
                    <div className="format-help">
                        <details>
                            <summary>📋 File Format Guide</summary>
                            <div className="format-examples">
                                <div className="format-example">
                                    <h5>JSON Format:</h5>
                                    <pre>{`{
  "topic": "Topic Name",
  "questions": [
    {
      "id": 1,
      "question": "Your question?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why A is correct"
    }
  ]
}`}</pre>
                                </div>
                                <div className="format-example">
                                    <h5>TXT Format:</h5>
                                    <pre>{`Q: Your question here?
A: Option A
B: Option B
C: Option C
D: Option D
Correct: A
Explanation: Why A is correct

Q: Next question?
A: ...`}</pre>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopicImporter;
