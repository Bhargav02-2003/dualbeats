import React from 'react';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const MessageReactions = ({ messageId, reactions = [], onReact, currentUserId, position }) => {
  // Group reactions by emoji with counts
  const grouped = QUICK_REACTIONS.reduce((acc, emoji) => {
    const matching = reactions.filter((r) => r.emoji === emoji);
    if (matching.length > 0) {
      acc[emoji] = {
        count: matching.length,
        reacted: matching.some((r) => r.userId?.toString() === currentUserId?.toString()),
      };
    }
    return acc;
  }, {});

  return (
    <div
      className="reaction-picker-popup"
      style={position ? { top: position.top, left: position.left } : {}}
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          className={`reaction-quick-btn${grouped[emoji]?.reacted ? ' reacted' : ''}`}
          onClick={() => onReact(messageId, emoji)}
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

/**
 * Inline reaction badges shown beneath a message bubble
 */
export const ReactionBadges = ({ reactions = [], onReact, messageId, currentUserId }) => {
  const grouped = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, reacted: false };
    grouped[r.emoji].count += 1;
    if (r.userId?.toString() === currentUserId?.toString()) {
      grouped[r.emoji].reacted = true;
    }
  }
  const entries = Object.entries(grouped);
  if (entries.length === 0) return null;

  return (
    <div className="reaction-badges">
      {entries.map(([emoji, { count, reacted }]) => (
        <button
          key={emoji}
          className={`reaction-badge${reacted ? ' reacted' : ''}`}
          onClick={() => onReact(messageId, emoji)}
        >
          {emoji} {count > 1 && <span>{count}</span>}
        </button>
      ))}
    </div>
  );
};

export default MessageReactions;
