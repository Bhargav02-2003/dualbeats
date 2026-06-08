import React from 'react';

const TypingIndicator = ({ userName }) => {
  if (!userName) return null;
  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span className="typing-dot" style={{ animationDelay: '0ms' }} />
        <span className="typing-dot" style={{ animationDelay: '200ms' }} />
        <span className="typing-dot" style={{ animationDelay: '400ms' }} />
      </div>
      <span className="typing-label">{userName} is typing…</span>
    </div>
  );
};

export default TypingIndicator;
