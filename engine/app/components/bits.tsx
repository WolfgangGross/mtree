/** Small shared pieces: colours, kind symbols, icons, labels. */
import type { CSSProperties, ReactNode } from 'react';
import type { Kind } from '../../content/types';
import { EDITABLE, openInEditor } from '../store';

/** A colour from content: a theme name ("green") or any CSS colour. */
export function color(value: string | undefined, fallback = 'var(--ink)'): string {
  if (!value) return fallback;
  if (value === 'ink') return 'var(--ink-color)';
  if (/^[a-z][a-z-]*$/.test(value)) return `var(--${value})`;
  return value;
}

export function KindSymbol({ kind, size = 9 }: { kind?: Kind; size?: number }) {
  if (!kind) return null;
  const style = { '--sym': color(kind.color), width: size, height: size } as CSSProperties;
  return <i className={`sym sym-${kind.shape}`} style={style} aria-hidden="true" />;
}

const ICON_PATHS: Record<string, ReactNode> = {
  layers: <path d="m3 10 7-5 7 5-7 5zM3 13l7 5 7-5M3 7l7-5 7 5" />,
  film: (
    <>
      <rect x="2" y="4" width="16" height="12" rx="2" />
      <path d="m8 7 5 3-5 3z" />
    </>
  ),
  robot: (
    <>
      <path d="M2 17h7M5 16v-3l4-6 6 2 2-5M15 3l2 1 2-1" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="9" r="1.5" />
    </>
  ),
  fork: (
    <>
      <path d="M5 5v8q0 2 2 2h7M5 8h6q3 0 3-3" />
      <circle cx="5" cy="3" r="2" />
      <circle cx="15" cy="3" r="2" />
      <circle cx="16" cy="15" r="2" />
    </>
  ),
  spark: <path d="M10 2v5M10 13v5M2 10h5M13 10h5M4.5 4.5l3 3M12.5 12.5l3 3M15.5 4.5l-3 3M7.5 12.5l-3 3" />,
  book: <path d="M3 4q4-2 7 1 3-3 7-1v12q-4-2-7 1-3-3-7-1zM10 5v12" />,
  atom: (
    <>
      <circle cx="10" cy="10" r="1.5" />
      <ellipse cx="10" cy="10" rx="8" ry="3.2" />
      <ellipse cx="10" cy="10" rx="8" ry="3.2" transform="rotate(60 10 10)" />
      <ellipse cx="10" cy="10" rx="8" ry="3.2" transform="rotate(120 10 10)" />
    </>
  ),
  chat: <path d="M3 4h14v9H8l-4 3v-3H3z" />,
  chip: (
    <>
      <rect x="5" y="5" width="10" height="10" rx="1" />
      <path d="M8 2v3M12 2v3M8 15v3M12 15v3M2 8h3M2 12h3M15 8h3M15 12h3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 10q8-10 16 0-8 10-16 0z" />
      <circle cx="10" cy="10" r="2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m13 13 5 5" />
    </>
  ),
  edit: <path d="M3 17l1-4L13.5 3.5l3 3L7 16zM11.5 5.5l3 3" />,
  arrow: <path d="M4 10h12M11 5l5 5-5 5" />,
  close: <path d="M5 5l10 10M15 5 5 15" />,
  external: <path d="M8 4H4v12h12v-4M11 3h6v6M17 3l-8 8" />,
};

export function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={`icon ${className ?? ''}`} viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      {ICON_PATHS[name] ?? ICON_PATHS.layers}
    </svg>
  );
}

/** A small "edit" button that opens a human/ file at a line in your editor (dev only). */
export function EditLink({ file, line, label = 'Edit' }: { file: string; line: number; label?: string }) {
  if (!EDITABLE) return null;
  return (
    <button type="button" className="edit-link" title={`Open ${file}:${line} in your editor`} onClick={() => openInEditor(file, line)}>
      <Icon name="edit" size={12} /> {label}
    </button>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`label ${className ?? ''}`}>{children}</span>;
}

export function StatusDot({ status }: { status: string }) {
  if (!status) return null;
  return <span className={`status status-${status.replace(' ', '-')}`}>{status}</span>;
}
