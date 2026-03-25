import { ProfileAvatar } from '@/components/ProfileAvatar';

interface TypingUser {
  id: string;
  email: string;
}

interface EditorTypingIndicatorProps {
  typingUsers: TypingUser[];
}

export function EditorTypingIndicator({ typingUsers }: EditorTypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-primary/5 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex -space-x-1.5">
        {typingUsers.slice(0, 3).map((user) => (
          <div
            key={user.id}
            className="w-5 h-5 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[9px] font-bold text-primary uppercase"
            title={user.email}
          >
            {user.email.split('@')[0].charAt(0)}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium">
        <span>
          {typingUsers.length === 1
            ? `${typingUsers[0].email.split('@')[0]} is aan het typen`
            : `${typingUsers.length} gebruikers zijn aan het typen`}
        </span>
        <span className="inline-flex gap-[2px] items-end h-3">
          <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  );
}
