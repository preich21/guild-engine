import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";
import { UserProfileCard, type UserProfileDictionary } from "@/components/user-profile-card";
import type { UserProfileData } from "@/lib/user-profile";

type UserProfilePopoverProps = {
  lang: Locale;
  profile: UserProfileData;
  dictionary: UserProfileDictionary;
  showLeaderboardPlacement: boolean;
  showStreak: boolean;
  showAchievements: boolean;
  avatarClassName?: string;
  triggerClassName?: string;
};

const getUserInitials = (username: string) => username.slice(0, 2).toUpperCase();

export function UserProfilePopover({
  lang,
  profile,
  dictionary,
  showLeaderboardPlacement,
  showStreak,
  showAchievements,
  avatarClassName,
  triggerClassName,
}: UserProfilePopoverProps) {
  const triggerLabel = dictionary.openProfileButton.replace("{username}", profile.username);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("rounded-full p-0", triggerClassName)}
            aria-label={triggerLabel}
            title={triggerLabel}
          >
            <Avatar className={cn("size-8 border border-border bg-background", avatarClassName)}>
              {profile.profilePicture ? (
                <AvatarImage src={profile.profilePicture} alt={profile.username} />
              ) : null}
              <AvatarFallback aria-hidden>{getUserInitials(profile.username)}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[min(96vw,44rem)] max-h-[85vh] overflow-y-auto p-0">
        <UserProfileCard
          lang={lang}
          profile={profile}
          dictionary={dictionary}
          mode="popover"
          showLeaderboardPlacement={showLeaderboardPlacement}
          showStreak={showStreak}
          showAchievements={showAchievements}
        />
      </PopoverContent>
    </Popover>
  );
}
