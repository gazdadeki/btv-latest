import React, { useEffect } from 'react';

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'BaltazarTV';
  }, []);

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Page not found</h1>
      <p style={{ color: '#666' }}>The page you requested does not exist.</p>
    </div>
  );
}
