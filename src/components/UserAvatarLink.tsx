"use client";

import Link from "next/link";

type UserLike = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
};

function getUserDisplayName(user: UserLike | null | undefined) {
  return user?.name || user?.username || user?.email?.split("@")[0] || "Me";
}

export function UserAvatarLink({
  user,
  subtitle,
  compact = false,
}: {
  user: UserLike | null | undefined;
  subtitle?: string;
  compact?: boolean;
}) {
  const displayName = getUserDisplayName(user);

  return (
    <Link
      href="/account"
      className={`inline-flex items-center gap-3 rounded-xl border border-card-border bg-card-bg px-2.5 py-2 transition-colors hover:bg-surface ${
        compact ? "min-w-0" : ""
      }`}
      title={displayName}
    >
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/20">
        {user?.image ? (
          <img src={user.image} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent-pink text-sm font-semibold text-white">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
        </div>
      )}
    </Link>
  );
}
