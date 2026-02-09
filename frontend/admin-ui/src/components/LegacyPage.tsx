import React, { useEffect } from 'react';

interface LegacyPageProps {
  html: string;
  onMount?: () => void | (() => void);
}

export default function LegacyPage({ html, onMount }: LegacyPageProps) {
  useEffect(() => {
    const cleanup = onMount?.();
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
