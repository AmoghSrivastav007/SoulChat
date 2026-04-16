"use client";

type Avatar3DProps = {
  displayName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: "h-10 w-10 text-sm",
  md: "h-16 w-16 text-xl",
  lg: "h-24 w-24 text-2xl"
};

export function Avatar3D({ displayName, avatarUrl, size = "lg" }: Avatar3DProps) {
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${sizeMap[size]} rounded-full object-cover shadow-lg ring-2 ring-[var(--accent)]`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 font-semibold text-white shadow-lg`}
    >
      {initials}
    </div>
  );
}
