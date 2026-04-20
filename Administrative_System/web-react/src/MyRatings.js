import React from 'react';

export default function MyRatings({ user, onBack }) {
  return (
    <div style={{ padding: '20px' }}>
      <button onClick={onBack}>← Back</button>
      <h1>My Ratings Page</h1>
      <p>This page will show your course ratings.</p>
    </div>
  );
}