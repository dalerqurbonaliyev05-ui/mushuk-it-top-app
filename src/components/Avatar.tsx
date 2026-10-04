export function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.45 };
  if (url) return <img className="avatar" style={style} src={url} alt="" referrerPolicy="no-referrer" />;
  return <span className="avatar ph" style={style}>{(name.trim()[0] ?? '?').toUpperCase()}</span>;
}
