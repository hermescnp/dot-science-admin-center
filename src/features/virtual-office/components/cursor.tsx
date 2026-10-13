import { useEffect, useState } from 'react';
import { useExperienceContext } from '../context/experience-context';
import styles from '../styles/Cursor.module.css';

export function CustomCursor() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const { placehover, isCursorTargeting, setIsCursorTargeting } = useExperienceContext();

  useEffect(() => {
    setIsCursorTargeting(!!placehover?.name);
  }, [placehover, setIsCursorTargeting]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (!position) return null;

  return (
    <div
      className={`${styles.cursor} ${isCursorTargeting ? styles.targeting : ''}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    />
  );
}
