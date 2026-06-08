import React, {
  useState, useEffect, useRef, useCallback
} from 'react';
import EmojiPicker from './EmojiPicker';
import TypingIndicator from './TypingIndicator';
import MessageReactions, { ReactionBadges } from './MessageReactions';
import api from '../../api/axios';

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const LONG_PRESS_MS = 500;

// ── Message Bubble ──────────────────────────────────────────────────────────
const MessageBubble = ({ msg, isMine, onReact, onReactOpen, currentUserId }) => {
  const longPressTimer = useRef(null);
  const bubbleRef = useRef(null);

  const handleContextMenu = (e) => {
    e.preventDefault();
    onReactOpen(msg._id, { top: e.clientY, left: e.clientX });
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      const rect = bubbleRef.current?.getBoundingClientRect();
      if (rect) onReactOpen(msg._id, { top: rect.top - 56, left: rect.left });
    }, LONG_PRESS_MS);
  };

  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

  const isEmojiOnly = msg.messageType === 'emoji' || (!msg.text && msg.emoji);
  const isMixed = msg.messageType === 'mixed';

  const ReadTick = () => {
    if (!isMine) return null;
    return msg.seen
      ? <span className="read-tick seen" title="Seen">✓✓</span>
      : <span className="read-tick sent" title="Sent">✓</span>;
  };

  return (
    <div className={`msg-group${isMine ? ' mine' : ' theirs'}`}>
      {!isMine && (
        <div className="msg-avatar">{(msg.senderName || 'G')[0].toUpperCase()}</div>
      )}
      <div className="msg-col">
        {!isMine && <span className="msg-sender">{msg.senderName}</span>}
        <div
          ref={bubbleRef}
          className={`msg-bubble${isMine ? ' bubble-mine' : ' bubble-theirs'}${isEmojiOnly ? ' bubble-emoji-only' : ''}`}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
        >
          {isEmojiOnly ? (
            <span className="emoji-large">{msg.emoji || msg.text}</span>
          ) : isMixed ? (
            <span>{msg.text} {msg.emoji}</span>
          ) : (
            <span>{msg.text}</span>
          )}
        </div>
        <ReactionBadges
          reactions={msg.reactions || []}
          onReact={onReact}
          messageId={msg._id}
          currentUserId={currentUserId}
        />
        <div className="msg-meta">
          <span className="msg-time">{formatTime(msg.createdAt)}</span>
          <ReadTick />
        </div>
      </div>
    </div>
  );
};

// ── ChatPanel ───────────────────────────────────────────────────────────────
const ChatPanel = ({ socket, roomCode, currentUser, roomInfo }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [reactionTarget, setReactionTarget] = useState(null); // { msgId, position }
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const typingTimeout = useRef(null);
  const typingHideTimeout = useRef(null);
  const inputRef = useRef(null);

  // ── Fetch history ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return;
    setLoading(true);
    api.get(`/api/chat/${roomCode}/history`)
      .then((res) => {
        setMessages(res.data.messages || []);
        setLoading(false);
        setTimeout(() => scrollToBottom('auto'), 50);
      })
      .catch(() => setLoading(false));
  }, [roomCode]);

  // ── Socket listeners ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      // Mark as seen if it's from someone else
      if (msg.senderId?.toString() !== currentUser?._id?.toString()) {
        socket.emit('chat:seen', { roomCode, messageId: msg._id });
        if (!isAtBottom) {
          setUnreadCount((n) => n + 1);
        }
      }
    };

    const onTyping = ({ userId, userName, isTyping }) => {
      if (isTyping) {
        setTypingUser(userName);
        clearTimeout(typingHideTimeout.current);
        typingHideTimeout.current = setTimeout(() => setTypingUser(null), 3000);
      } else {
        setTypingUser(null);
      }
    };

    const onSeen = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id?.toString() === messageId?.toString() ? { ...m, seen: true } : m))
      );
    };

    const onReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id?.toString() === messageId?.toString() ? { ...m, reactions } : m))
      );
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('chat:seen', onSeen);
    socket.on('chat:reaction', onReaction);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('chat:seen', onSeen);
      socket.off('chat:reaction', onReaction);
    };
  }, [socket, roomCode, currentUser, isAtBottom]);

  // ── Auto-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAtBottom) scrollToBottom();
  }, [messages, typingUser, isAtBottom]);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  };

  const handleScrollToBottom = () => {
    scrollToBottom();
    setUnreadCount(0);
    setIsAtBottom(true);
  };

  // ── Send message ───────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text || !socket || !roomCode) return;

    // Detect emoji-only
    const emojiOnly = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*$/u.test(text);
    const msgType = emojiOnly ? 'emoji' : 'text';

    socket.emit('chat:send', {
      roomCode,
      text: emojiOnly ? '' : text,
      emoji: emojiOnly ? text : '',
      messageType: msgType,
    });

    setInputText('');
    clearTimeout(typingTimeout.current);
    socket.emit('chat:typing', { roomCode, isTyping: false });
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, [inputText, socket, roomCode]);

  // ── Typing handler ─────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket || !roomCode) return;
    socket.emit('chat:typing', { roomCode, isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('chat:typing', { roomCode, isTyping: false });
    }, 2000);
  };

  // ── Emoji picker ───────────────────────────────────────────────────────
  const handleEmojiSelect = (emoji) => {
    const input = inputRef.current;
    if (!input) { setInputText((t) => t + emoji); return; }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const newVal = inputText.slice(0, start) + emoji + inputText.slice(end);
    setInputText(newVal);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  // ── Reaction ───────────────────────────────────────────────────────────
  const handleReact = useCallback((messageId, emoji) => {
    if (!socket || !roomCode) return;
    socket.emit('chat:react', { roomCode, messageId, emoji });
    setReactionTarget(null);
  }, [socket, roomCode]);

  const handleReactOpen = (msgId, position) => {
    setReactionTarget(reactionTarget?.msgId === msgId ? null : { msgId, position });
  };

  // ── Clear chat ─────────────────────────────────────────────────────────
  const handleClearChat = async () => {
    if (!window.confirm('Clear all chat history for this room?')) return;
    try {
      await api.delete(`/api/chat/${roomCode}`);
      setMessages([]);
    } catch { /* silent */ }
  };

  // ── Close popups on outside click ─────────────────────────────────────
  const handlePanelClick = () => {
    setShowEmojiPicker(false);
    setReactionTarget(null);
  };

  if (!roomCode) {
    return (
      <div className="chat-panel chat-empty-state">
        <div className="chat-empty-icon">💬</div>
        <p>Join a room to start chatting</p>
      </div>
    );
  }

  return (
    <div className="chat-panel" onClick={handlePanelClick}>
      {/* ── Header ── */}
      <div className="chat-header">
        <div className="chat-header-left">
          <span className="chat-header-icon">💬</span>
          <span className="chat-header-title">Room Chat</span>
          {roomInfo && (
            <span className="chat-member-badge">{roomInfo.userCount} online</span>
          )}
        </div>
        <button className="chat-clear-btn" onClick={handleClearChat} title="Clear chat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>

      {/* ── Messages area ── */}
      <div
        className="chat-messages"
        ref={messagesAreaRef}
        onScroll={handleScroll}
      >
        {loading && (
          <div className="chat-loading">
            <div className="chat-loading-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="chat-no-messages">
            <span>🎵</span>
            <p>No messages yet.<br />Say hello!</p>
          </div>
        )}

        {messages.map((msg) => (
          <React.Fragment key={msg._id}>
            <MessageBubble
              msg={msg}
              isMine={msg.senderId?.toString() === currentUser?._id?.toString()}
              onReact={handleReact}
              onReactOpen={handleReactOpen}
              currentUserId={currentUser?._id}
            />
            {reactionTarget?.msgId === msg._id && (
              <MessageReactions
                messageId={msg._id}
                reactions={msg.reactions || []}
                onReact={handleReact}
                currentUserId={currentUser?._id}
                position={reactionTarget.position}
              />
            )}
          </React.Fragment>
        ))}

        {typingUser && <TypingIndicator userName={typingUser} />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── New message jump button ── */}
      {!isAtBottom && unreadCount > 0 && (
        <button className="chat-scroll-btn" onClick={handleScrollToBottom}>
          {unreadCount} new ↓
        </button>
      )}

      {/* ── Emoji picker popup ── */}
      {showEmojiPicker && (
        <div className="emoji-picker-wrap" onClick={(e) => e.stopPropagation()}>
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="chat-input-bar" onClick={(e) => e.stopPropagation()}>
        <button
          className={`emoji-toggle-btn${showEmojiPicker ? ' active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setShowEmojiPicker((v) => !v); }}
          title="Emoji"
        >
          😊
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Message…"
          className="chat-input"
          maxLength={500}
        />

        {inputText.trim() && (
          <button className="chat-send-btn" onClick={sendMessage} title="Send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
