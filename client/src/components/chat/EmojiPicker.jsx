import React, { useMemo, useState } from 'react';

const EMOJI_CATEGORIES = {
  Faces: ['😂','🤣','😊','😇','🥰','😍','🤩','😘','😗','😙','😚','🙂','🤗','🤭','🤫','🤔','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴'],
  Gestures: ['👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👋','🤚','🖐️','✋','🖖'],
  Love: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗'],
  Music: ['🎵','🎶','🎸','🎹','🎺','🎻','🥁','🎤','🎧','🎼','🎷','🪗','🪘','🎙️','📻'],
  Fun: ['🎉','🎊','🎈','🎁','🏆','🥇','🌟','⭐','💫','✨','🔥','💥','🎆','🎇','🧨','🪄','🎭','🎪','🎠','🎡'],
  Popular: ['😭','😤','🤯','😱','🥳','😎','🤓','🧐','🥸','😈','👿','💀','☠️','👻','👾','🤖','💩','🙈','🙉','🙊'],
};

const EMOJI_KEYWORDS = {
  '😂': 'laugh cry funny','🤣': 'rolling laugh','😊': 'smile happy','😇': 'angel halo','🥰': 'love smiling hearts',
  '😍': 'heart eyes love','🤩': 'star eyes wow','😘': 'kiss love','❤️': 'heart love red','🎵': 'music note',
  '🎶': 'music notes','🎉': 'party celebrate','🔥': 'fire hot','💀': 'skull dead','👍': 'thumbs up good',
  '👎': 'thumbs down bad','😭': 'crying sob','😎': 'cool sunglasses','🤯': 'mind blown','😱': 'shocked scared',
};

const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

const getRecent = () => {
  try {
    return JSON.parse(localStorage.getItem('recentEmojis') || '[]');
  } catch { return []; }
};

const addRecent = (emoji) => {
  try {
    const prev = getRecent().filter((e) => e !== emoji);
    const next = [emoji, ...prev].slice(0, 21);
    localStorage.setItem('recentEmojis', JSON.stringify(next));
  } catch {}
};

const EmojiPicker = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Recent');
  const recent = getRecent();

  const categories = useMemo(() => {
    const cats = {};
    if (recent.length > 0) cats['Recent'] = recent;
    Object.assign(cats, EMOJI_CATEGORIES);
    return cats;
  }, [recent.length]); // eslint-disable-line

  const displayEmojis = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return ALL_EMOJIS.filter((e) => {
        const kw = EMOJI_KEYWORDS[e] || '';
        return e.includes(q) || kw.includes(q);
      });
    }
    return categories[activeCategory] || [];
  }, [search, activeCategory, categories]);

  const handleSelect = (emoji) => {
    addRecent(emoji);
    onSelect(emoji);
  };

  const catList = Object.keys(categories);

  return (
    <div
      className="emoji-picker-popup"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search */}
      <div className="ep-search-wrap">
        <span className="ep-search-icon">🔍</span>
        <input
          className="ep-search"
          placeholder="Search emojis…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="ep-cats">
          {catList.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`ep-cat-btn${activeCategory === cat ? ' active' : ''}`}
              title={cat}
            >
              {cat === 'Recent' ? '🕐' : cat === 'Faces' ? '😊' : cat === 'Gestures' ? '👍'
                : cat === 'Love' ? '❤️' : cat === 'Music' ? '🎵' : cat === 'Fun' ? '🎉' : '🔥'}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="ep-grid">
        {displayEmojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            className="ep-emoji-btn"
            onClick={() => handleSelect(emoji)}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
        {displayEmojis.length === 0 && (
          <p className="ep-empty">No emojis found 😅</p>
        )}
      </div>
    </div>
  );
};

export default EmojiPicker;
export { addRecent };
