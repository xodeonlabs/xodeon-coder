import { useAchievements } from '@/hooks/useAchievements';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AchievementsGridProps {
  userId: string | undefined;
}

const rarityColors = {
  common: 'border-gray-500 bg-gray-500/5',
  uncommon: 'border-green-500 bg-green-500/5',
  rare: 'border-blue-500 bg-blue-500/5',
  epic: 'border-purple-500 bg-purple-500/5',
  legendary: 'border-yellow-500 bg-yellow-500/5',
};

export function AchievementsGrid({ userId }: AchievementsGridProps) {
  const { allAchievements, unlockedAchievements, loading } = useAchievements(userId);

  if (loading) {
    return <div className="text-center text-muted-foreground">Achievements laden...</div>;
  }

  const unlockedIds = new Set(unlockedAchievements.map(a => a.id));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {allAchievements.map(achievement => {
        const isUnlocked = unlockedIds.has(achievement.id);
        const unlockedAchievement = unlockedAchievements.find(a => a.id === achievement.id);

        return (
          <div
            key={achievement.id}
            className={cn(
              'rounded-lg border-2 p-4 text-center transition-all hover:shadow-md',
              isUnlocked
                ? rarityColors[achievement.rarity]
                : 'border-muted bg-muted/30 opacity-50'
            )}
            title={achievement.description}
          >
            <div className="text-3xl mb-2 relative">
              {achievement.icon_emoji}
              {!isUnlocked && (
                <Lock className="absolute top-0 right-0 h-3 w-3 text-muted-foreground" />
              )}
            </div>

            <h3 className="text-xs font-semibold text-foreground truncate">{achievement.name}</h3>

            {isUnlocked && unlockedAchievement && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(unlockedAchievement.unlocked_at).toLocaleDateString()}
              </p>
            )}

            {achievement.points_reward > 0 && (
              <p className="text-[10px] font-medium text-yellow-600 dark:text-yellow-400 mt-1">
                +{achievement.points_reward}pts
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
