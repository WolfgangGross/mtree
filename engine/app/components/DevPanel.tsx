/** Dev only: a quiet badge with the result of checking human/, expandable to a list you can click to fix. */
import { useState } from 'react';
import { openInEditor, useContent } from '../store';

export function DevPanel() {
  const { diagnostics } = useContent();
  const [open, setOpen] = useState(false);
  const errors = diagnostics.filter((d) => d.level === 'error').length;
  const warnings = diagnostics.length - errors;
  const label = errors ? `${errors} error${errors === 1 ? '' : 's'}` : warnings ? `${warnings} warning${warnings === 1 ? '' : 's'}` : 'human/ ✓';
  return (
    <div className={`dev-panel${errors ? ' has-errors' : warnings ? ' has-warnings' : ''}`}>
      {open && diagnostics.length > 0 && (
        <ul className="dev-list">
          {diagnostics.map((d, i) => (
            <li key={i}>
              <button type="button" onClick={() => openInEditor(d.file, d.line)} title="Open in your editor">
                <span className={`dev-level ${d.level}`}>{d.level}</span>
                <span className="dev-where">
                  {d.file.replace(/^human\//, '')}:{d.line}
                </span>
                <span className="dev-msg">{d.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="dev-badge" onClick={() => setOpen(!open)} title={diagnostics.length ? 'Show content problems' : 'Every file in human/ parses cleanly'}>
        {label}
      </button>
    </div>
  );
}
