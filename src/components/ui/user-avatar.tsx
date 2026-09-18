import { Crown, Shield, Briefcase, Wallet, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | number;

export interface AvatarUser {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
}

interface UserAvatarProps {
  user: AvatarUser;
  size?: AvatarSize;
  showRoleBadge?: boolean;
  className?: string;
}

const SIZE_PX: Record<Exclude<AvatarSize, number>, number> = { xs: 24, sm: 32, md: 40, lg: 64 };

const ROLE_ICON: Record<string, LucideIcon> = {
  owner: Crown,
  branch_manager: Shield,
  loan_officer: Briefcase,
  cashier: Wallet,
};

function initials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]![0] || 'U').toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function UserAvatar({ user, size = 'md', showRoleBadge = false, className }: UserAvatarProps) {
  const px = typeof size === 'number' ? size : SIZE_PX[size];
  const Badge = user.role ? ROLE_ICON[user.role] : undefined;

  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: px, height: px }}>
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar_url}
          alt={user.full_name || 'User avatar'}
          className="h-full w-full rounded-full object-cover"
          style={{ width: px, height: px }}
        />
      ) : (
        <span
          className="flex items-center justify-center rounded-full bg-accent-primary font-bold text-accent-on-primary"
          style={{ width: px, height: px, fontSize: Math.max(px * 0.38, 10) }}
        >
          {initials(user.full_name)}
        </span>
      )}
      {showRoleBadge && Badge && (
        <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-accent-primary text-white" style={{ width: px * 0.45, height: px * 0.45, minWidth: 14, minHeight: 14 }}>
          <Badge size={Math.max(px * 0.28, 9)} />
        </span>
      )}
    </span>
  );
}
