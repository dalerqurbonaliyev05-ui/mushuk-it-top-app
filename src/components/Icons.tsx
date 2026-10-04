/** Chiziqli ikonkalar to'plami (tashqi kutubxonasiz). */
const P: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  plus: 'M12 5v14M5 12h14',
  bell: 'M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  heart: 'M12 20S4 14.5 4 9a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 5.5-8 11-8 11z',
  comment: 'M4 5h16v11H9l-5 4V5z',
  pin: 'M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  back: 'M15 5l-7 7 7 7',
  dots: 'M12 5v.01M12 12v.01M12 19v.01',
  locate: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  chevron: 'M9 5l7 7-7 7',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  ruler: 'M3 17L17 3l4 4L7 21l-4-4zM8 12l2 2M11 9l2 2M14 6l2 2',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
  mail: 'M3 6h18v12H3V6zM3 7l9 7 9-7',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17v.01',
  logout: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  image: 'M4 5h16v14H4V5zM4 16l5-5 4 4 3-3 4 4M9 9.5a1 1 0 1 0 0-.01',
  send: 'M4 12l16-8-6 16-3-7-7-1z',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
  sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, fill = false, className }: { name: IconName; size?: number; fill?: boolean; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}
