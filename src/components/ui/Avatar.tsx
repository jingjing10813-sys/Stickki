export function isImageAvatar(avatar?: string | null): boolean {
  return !!avatar && (avatar.startsWith("data:image") || avatar.startsWith("http"));
}

export function Avatar({
  avatar,
  fallback,
  size,
  className,
  style,
}: {
  avatar?: string | null;
  fallback: React.ReactNode;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (isImageAvatar(avatar)) {
    return (
      <img
        src={avatar!}
        alt=""
        className={className}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, ...style }}
      />
    );
  }
  return (
    <span className={className} style={style}>
      {avatar || fallback}
    </span>
  );
}
