import { useState, useEffect, useMemo } from 'react';
import { Search, Smile, Heart, Sun, Car, Coffee, Football, Flag, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Comprehensive emoji data organized by categories
export const EMOJI_CATEGORIES = {
  recent: {
    name: 'Recent',
    icon: '🕒',
    emojis: [] as string[], // Will be populated from localStorage
  },
  faces: {
    name: 'Faces & People',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
      '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
    ],
  },
  nature: {
    name: 'Nature',
    icon: '🌿',
    emojis: [
      '🌱', '🌿', '🍀', '🌾', '🌵', '🌲', '🌳', '🌴', '🌹', '🌺',
      '🌻', '🌷', '🌸', '💐', '🏵️', '🌼', '🌧️', '⛈️', '🌩️', '🌨️',
      '❄️', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌈', '☔', '⚡',
      '🔥', '💧', '🌊', '🎃', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇',
      '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆'
    ],
  },
  objects: {
    name: 'Objects',
    icon: '💡',
    emojis: [
      '💡', '🔧', '🔨', '⚙️', '🛠️', '⚡', '🔋', '🖥️', '💻', '⌨️',
      '🖱️', '📱', '☎️', '📞', '📟', '📠', '📺', '📻', '🎥', '📷',
      '📸', '📹', '📼', '💾', '💿', '📀', '🎮', '🕹️', '🎲', '🎯',
      '🎪', '🎨', '🖌️', '🖍️', '📝', '💼', '📁', '📂', '🗂️', '📅',
      '📆', '🗓️', '📇', '🗃️', '🗄️', '📋', '📌', '📍', '📎', '🖇️'
    ],
  },
  transport: {
    name: 'Transport',
    icon: '🚗',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🚁', '✈️',
      '🛩️', '🛫', '🛬', '🚀', '🛸', '🚊', '🚉', '🚝', '🚄', '🚅',
      '🚈', '🚞', '🚋', '🚃', '🚂', '🚆', '🚇', '🚏', '⛵', '🛥️',
      '🚤', '⛴️', '🛳️', '🚢', '⚓', '⛽', '🚧', '🚨', '🚥', '🚦'
    ],
  },
  symbols: {
    name: 'Symbols',
    icon: '⭐',
    emojis: [
      '⭐', '🌟', '✨', '💫', '💥', '💢', '💦', '💨', '💤', '💭',
      '💯', '💸', '💰', '💎', '💳', '🧿', '📿', '💿', '🔮', '🎭',
      '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎹', '🥁',
      '🎷', '🎺', '🎸', '🎻', '🎲', '♠️', '♥️', '♦️', '♣️', '🃏',
      '🀄', '🎴', '🔇', '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔'
    ],
  },
  flags: {
    name: 'Flags',
    icon: '🏁',
    emojis: [
      '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇫', '🇦🇱',
      '🇩🇿', '🇦🇩', '🇦🇴', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸',
      '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇹', '🇧🇴', '🇧🇦',
      '🇧🇼', '🇧🇷', '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇳',
      '🇺🇸', '🇬🇧', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇯🇵', '🇨🇳', '🇰🇷', '🇷🇺'
    ],
  },
} as const;

// Popular emojis that are commonly used for services
const POPULAR_EMOJIS = [
  '🔧', '🛠️', '💡', '🏠', '🚗', '💻', '📱', '✂️', '🧼', '🍳',
  '🎨', '🎭', '🎪', '🎸', '📷', '💊', '🩺', '✏️', '📚', '🎓',
  '💼', '👔', '🏃', '🚴', '⚽', '🏆', '🌟', '⭐', '💯', '✅'
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  selectedEmoji?: string;
  className?: string;
}

export function EmojiPicker({ onSelect, selectedEmoji, className }: EmojiPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('recent');

  // Load recent emojis from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recent-emojis');
    if (saved) {
      try {
        setRecentEmojis(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse recent emojis:', error);
      }
    }
  }, []);

  // Save emoji to recent list
  const saveToRecent = (emoji: string) => {
    const newRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 20);
    setRecentEmojis(newRecent);
    localStorage.setItem('recent-emojis', JSON.stringify(newRecent));
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    saveToRecent(emoji);
    onSelect(emoji);
  };

  // Filter emojis based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm) {
      return {
        ...EMOJI_CATEGORIES,
        recent: {
          ...EMOJI_CATEGORIES.recent,
          emojis: recentEmojis.length > 0 ? recentEmojis : POPULAR_EMOJIS,
        },
      };
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered: typeof EMOJI_CATEGORIES = {} as any;

    // Search through all categories
    Object.entries(EMOJI_CATEGORIES).forEach(([key, category]) => {
      if (key === 'recent') return; // Skip recent in search

      const matchingEmojis = category.emojis.filter(emoji => {
        // Simple search - could be enhanced with emoji names/descriptions
        return emoji.includes(searchLower);
      });

      if (matchingEmojis.length > 0) {
        filtered[key as keyof typeof EMOJI_CATEGORIES] = {
          ...category,
          emojis: matchingEmojis,
        };
      }
    });

    return filtered;
  }, [searchTerm, recentEmojis]);

  // Get current category emojis
  const currentEmojis = useMemo(() => {
    if (searchTerm) {
      // In search mode, show all filtered emojis
      return Object.values(filteredCategories).flatMap(cat => cat.emojis);
    }

    if (activeCategory === 'recent') {
      return recentEmojis.length > 0 ? recentEmojis : POPULAR_EMOJIS;
    }

    return EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES]?.emojis || [];
  }, [activeCategory, searchTerm, filteredCategories, recentEmojis]);

  return (
    <div className={cn('w-full max-w-md mx-auto bg-background border rounded-lg shadow-lg', className)}>
      {/* Search bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search emojis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="emoji-search-input"
          />
        </div>
      </div>

      <div className="h-80 flex flex-col">
        {!searchTerm && (
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
            {/* Category tabs */}
            <TabsList className="grid grid-cols-6 h-12 m-2">
              {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="p-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  data-testid={`emoji-category-${key}`}
                >
                  <span className="text-lg">{category.icon}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Emoji grid for each category */}
            {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
              <TabsContent
                key={key}
                value={key}
                className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col"
              >
                <ScrollArea className="flex-1 px-2">
                  <div className="grid grid-cols-8 gap-1 p-2">
                    {(key === 'recent' ? (recentEmojis.length > 0 ? recentEmojis : POPULAR_EMOJIS) : category.emojis).map((emoji, index) => (
                      <Button
                        key={`${emoji}-${index}`}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-8 w-8 p-0 hover:bg-muted text-lg',
                          selectedEmoji === emoji && 'bg-primary text-primary-foreground'
                        )}
                        onClick={() => handleEmojiSelect(emoji)}
                        data-testid={`emoji-${emoji}`}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Search results */}
        {searchTerm && (
          <ScrollArea className="flex-1 px-2">
            <div className="p-2">
              {currentEmojis.length > 0 ? (
                <div className="grid grid-cols-8 gap-1">
                  {currentEmojis.map((emoji, index) => (
                    <Button
                      key={`${emoji}-${index}`}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0 hover:bg-muted text-lg',
                        selectedEmoji === emoji && 'bg-primary text-primary-foreground'
                      )}
                      onClick={() => handleEmojiSelect(emoji)}
                      data-testid={`emoji-search-${emoji}`}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Smile className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No emojis found</p>
                  <p className="text-xs">Try a different search term</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Selected emoji preview */}
      {selectedEmoji && (
        <div className="p-4 border-t bg-muted/50 text-center">
          <div className="text-3xl mb-2">{selectedEmoji}</div>
          <p className="text-xs text-muted-foreground">Selected emoji</p>
        </div>
      )}
    </div>
  );
}

// Simplified emoji picker for inline use
interface EmojiButtonProps {
  emoji?: string;
  onSelect: (emoji: string) => void;
  placeholder?: string;
  className?: string;
}

export function EmojiButton({ emoji, onSelect, placeholder = "Select emoji", className }: EmojiButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className={cn('w-12 h-12 p-0 text-xl', className)}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="emoji-button"
      >
        {emoji || '😀'}
      </Button>
      
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2">
          <EmojiPicker
            selectedEmoji={emoji}
            onSelect={(selectedEmoji) => {
              onSelect(selectedEmoji);
              setIsOpen(false);
            }}
          />
        </div>
      )}
      
      {/* Backdrop to close picker */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default EmojiPicker;