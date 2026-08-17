import React, { createContext, useState, useEffect, useContext, useRef } from 'react';

const TimerContext = createContext();

export const useTimer = () => useContext(TimerContext);

export const TimerProvider = ({ children }) => {
  const [activeTimer, setActiveTimer] = useState(() => {
    const saved = localStorage.getItem('activecap_timer');
    return saved ? JSON.parse(saved) : null;
  });

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [logSessionData, setLogSessionData] = useState(null);
  const timerIntervalRef = useRef(null);

  // Sync state to localStorage to persist across reloads
  useEffect(() => {
    if (activeTimer) {
      localStorage.setItem('activecap_timer', JSON.stringify(activeTimer));
    } else {
      localStorage.removeItem('activecap_timer');
      localStorage.removeItem('activecap_timer_start');
    }
  }, [activeTimer]);

  // Request browser notification permissions
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  // Play custom synthesized dual-tone double chime (Web Audio API)
  const playAlertChime = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      
      // First chime (C5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain1.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3); // fade out
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.3);

      // Second chime (E5, slightly delayed for double-ding effect)
      setTimeout(() => {
        if (audioCtx.state === 'closed') return;
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain2.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.4);
      }, 150);

    } catch (e) {
      console.error('Failed to play synthesized alert chime:', e);
    }
  };

  // Timer actions
  const startTimer = (projectId, projectTitle) => {
    requestNotificationPermission();
    const startTimeStamp = Date.now();
    localStorage.setItem('activecap_timer_start', startTimeStamp.toString());
    setActiveTimer({
      projectId,
      projectTitle,
      startTime: startTimeStamp,
    });
    setSecondsElapsed(0);
  };

  const stopTimer = () => {
    const finalSeconds = secondsElapsed;
    const projId = activeTimer.projectId;
    const projTitle = activeTimer.projectTitle;

    setActiveTimer(null);
    setSecondsElapsed(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    const minutes = Math.max(1, Math.round(finalSeconds / 60));
    setLogSessionData({ projectId: projId, projectTitle: projTitle, minutes });
    return minutes;
  };

  const cancelTimer = () => {
    setActiveTimer(null);
    setSecondsElapsed(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Restore/Calculate seconds elapsed based on real timestamp differences to survive page reloads/hibernation
  useEffect(() => {
    if (activeTimer) {
      const startStamp = localStorage.getItem('activecap_timer_start');
      if (startStamp) {
        const elapsed = Math.floor((Date.now() - parseInt(startStamp, 10)) / 1000);
        setSecondsElapsed(elapsed >= 0 ? elapsed : 0);
      }
    }
  }, [activeTimer]);

  // Interval ticking logic
  useEffect(() => {
    if (activeTimer) {
      timerIntervalRef.current = setInterval(() => {
        setSecondsElapsed((prev) => {
          const next = prev + 1;
          
          // 15-minute alert loop (temporarily set to 10 seconds for testing)
          if (next > 0 && next % 10 === 0) {
            // 1. Play sound
            playAlertChime();

            // 2. Trigger push notification
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('Still focusing?', {
                  body: `You have been tracking "${activeTimer.projectTitle}" for ${next} seconds.`,
                  icon: '/favicon.ico',
                });
              } catch (err) {
                console.error('Failed to trigger notification:', err);
              }
            }

            // 3. Trigger native blocking alert (runs deferred so it doesn't block state updates in the same render tick)
            setTimeout(() => {
              alert(`Focus check! You have been tracking "${activeTimer.projectTitle}" for ${next} seconds. Are you still actively working?`);
            }, 50);
          }

          return next;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeTimer]);

  // Format helper: seconds -> MM:SS or HH:MM:SS
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    const formattedM = m.toString().padStart(2, '0');
    const formattedS = s.toString().padStart(2, '0');
    
    if (h > 0) {
      return `${h}:${formattedM}:${formattedS}`;
    }
    return `${formattedM}:${formattedS}`;
  };

  // Sync tab title with active timer
  useEffect(() => {
    if (activeTimer) {
      const timeStr = formatTime(secondsElapsed);
      document.title = `[${timeStr}] - ${activeTimer.projectTitle}`;
    } else {
      document.title = 'Active Cap';
    }

    return () => {
      document.title = 'Active Cap';
    };
  }, [activeTimer, secondsElapsed]);

  const value = {
    activeTimer,
    secondsElapsed,
    startTimer,
    stopTimer,
    cancelTimer,
    formatTime,
    logSessionData,
    setLogSessionData,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};
