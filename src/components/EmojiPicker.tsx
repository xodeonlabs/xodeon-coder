import { useState } from 'react';
import { X } from 'lucide-react';

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: '😀 Smileys',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😋','😛','🤪','😎','🤓','🧐','🤠','🥳','😏','😌','🤗','🤔','🤫','🤥','😶','😐','😑','😬','🙄','😯','😧','🥱','😴','🤮','🤑','😈','👿','💀','👻','👽','🤖','💩','🎃'],
  },
  {
    label: '🏢 Bedrijf',
    emojis: ['🏢','🏗️','🏭','🏬','🏪','🏠','🏰','🏛️','⛪','🕌','🕍','💼','📊','📈','📉','💰','💵','💎','🏆','🎯','🚀','⚡','🔥','💡','🛠️','⚙️','🔧','🔨','📌','📎','✏️','📝','📁','📂','💻','🖥️','⌨️','🖱️','📱','☎️','📞','📡','🔔','🔑','🔒','🔓'],
  },
  {
    label: '🎮 Games & Fun',
    emojis: ['🎮','🕹️','🎲','🎯','🎪','🎭','🎨','🎬','🎤','🎧','🎵','🎶','🎸','🥁','🎹','🎺','🎻','🏀','⚽','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🎿','🏆','🥇','🥈','🥉','🎖️','🏅','🎗️'],
  },
  {
    label: '🌿 Natuur',
    emojis: ['🌿','🍀','🌱','🌲','🌳','🌴','🌵','🌾','🌺','🌻','🌹','🌷','💐','🍄','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🦄','🐝','🦋','🐢','🐬','🐳','🦈','🐙','🦀'],
  },
  {
    label: '🍕 Eten',
    emojis: ['🍕','🍔','🍟','🌭','🥪','🌮','🌯','🥗','🍝','🍜','🍛','🍣','🍱','🥟','🍤','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','🍮','🍦','🧇','🥞','🧈','🍳','🥚','🥓','🥩','🍗','🍖','☕','🍵','🧃','🥤','🍺','🍷','🥂','🍾'],
  },
  {
    label: '✨ Symbolen',
    emojis: ['✨','⭐','🌟','💫','🔆','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','♻️','☮️','✝️','☪️','🕉️','☯️','✡️','🔯','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','⛎','🔀','🔁','🔂','▶️','⏸️','⏹️','⏺️','⏭️','⏮️','🔼','🔽'],
  },
  {
    label: '🚗 Vervoer',
    emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚊','✈️','🛩️','🚀','🛸','🚁','⛵','🚢','🛥️','⛴️'],
  },
  {
    label: '🏁 Vlaggen',
    emojis: ['🏁','🚩','🎌','🏴','🏳️','🇳🇱','🇧🇪','🇩🇪','🇫🇷','🇬🇧','🇺🇸','🇪🇸','🇮🇹','🇵🇹','🇧🇷','🇯🇵','🇰🇷','🇨🇳','🇮🇳','🇷🇺','🇦🇺','🇨🇦','🇲🇽','🇹🇷','🇸🇦'],
  },
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ value, onChange, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);

  const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
  const filtered = search
    ? allEmojis.filter(e => e.includes(search))
    : EMOJI_CATEGORIES[activeCategory]?.emojis || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="rounded-2xl border border-border/50 w-full max-w-md shadow-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h3 className="text-base font-bold text-foreground">Kies een emoji</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-border/50">
          <input
            type="text"
            placeholder="Zoek emoji..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        {!search && (
          <div className="flex gap-1 px-4 pt-3 pb-1 overflow-x-auto">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(i)}
                className={`px-2 py-1 rounded-md text-xs whitespace-nowrap transition-all ${
                  activeCategory === i
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground hover:bg-secondary/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
        <div className="p-4 grid grid-cols-8 gap-1 max-h-[280px] overflow-y-auto">
          {filtered.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => { onChange(emoji); onClose(); }}
              className={`p-2 rounded-lg flex items-center justify-center text-xl transition-all hover:scale-110 ${
                value === emoji
                  ? 'bg-primary/20 ring-2 ring-primary'
                  : 'hover:bg-secondary/60'
              }`}
            >
              {emoji}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-8 text-center text-sm text-muted-foreground py-8">Geen emoji's gevonden</p>
          )}
        </div>
      </div>
    </div>
  );
}
