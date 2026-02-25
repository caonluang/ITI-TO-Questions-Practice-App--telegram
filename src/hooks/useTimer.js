import { useState, useEffect, useCallback, useRef } from 'react';

export const useTimer = (initialTime, onTimeout) => {
    const [timeLeft, setTimeLeft] = useState(initialTime);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef(null);
    const startTimeRef = useRef(null);
    const pausedElapsedRef = useRef(0);

    const start = useCallback(() => {
        setTimeLeft(initialTime);
        setIsRunning(true);
        setIsPaused(false);
        startTimeRef.current = Date.now();
        pausedElapsedRef.current = 0;
    }, [initialTime]);

    const stop = useCallback(() => {
        setIsRunning(false);
        setIsPaused(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    }, []);

    const pause = useCallback(() => {
        if (isRunning && !isPaused) {
            setIsPaused(true);
            setIsRunning(false);
            // Save elapsed time so far
            if (startTimeRef.current) {
                pausedElapsedRef.current += (Date.now() - startTimeRef.current) / 1000;
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
    }, [isRunning, isPaused]);

    const resume = useCallback(() => {
        if (isPaused) {
            setIsPaused(false);
            setIsRunning(true);
            startTimeRef.current = Date.now();
        }
    }, [isPaused]);

    const reset = useCallback(() => {
        stop();
        setTimeLeft(initialTime);
        pausedElapsedRef.current = 0;
    }, [initialTime, stop]);

    const getElapsedTime = useCallback(() => {
        let elapsed = pausedElapsedRef.current;
        if (startTimeRef.current && isRunning) {
            elapsed += (Date.now() - startTimeRef.current) / 1000;
        }
        return elapsed;
    }, [isRunning]);

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 0.1) {
                        setIsRunning(false);
                        if (onTimeout) onTimeout();
                        return 0;
                    }
                    return prev - 0.1;
                });
            }, 100);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, onTimeout]);

    return {
        timeLeft,
        isRunning,
        isPaused,
        start,
        stop,
        pause,
        resume,
        reset,
        getElapsedTime,
    };
};
