import { useState } from 'react';

export function useHistory() {
  const [history, setHistory] = useState<string[]>(['main']);

  const pushToHistory = (item: string) => {
    setHistory((prevHistory) => {
      if (prevHistory[prevHistory.length - 1] === item) {
        return prevHistory;
      }
      return [...prevHistory, item];
    });
  };

  const stepBackHistory = () => {
    setHistory((prevHistory) => (prevHistory.length > 0 ? prevHistory.slice(0, -1) : prevHistory));
  };

  const getLastHistoryItem = (): string =>
    history.length > 0 ? history[history.length - 1] : 'root';

  const getPrevHistoryItem = (): string =>
    history.length > 1 ? history[history.length - 2] : 'main';

  return { history, pushToHistory, stepBackHistory, getLastHistoryItem, getPrevHistoryItem };
}
