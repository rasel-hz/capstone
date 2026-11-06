import { memo, useId, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { useAppSelector } from '../../context/AppStateContext';
import { level } from '../../utils';
import { legacySvg } from './legacySvg';
import { BASE_IMAGE, CLIPS, EXPRESSIONS, SIZES, type MascotSize, type MascotState } from './manifest';

interface MascotProps {
  state?: MascotState;
  size?: MascotSize;
  /** Adds a small hover and focus response. */
  interactive?: boolean;
  /** Stops continuous movement during focus tasks. One-time reactions still play. */
  still?: boolean;
  /** Spoken description. Leave empty when the mascot is decorative. */
  label?: string;
  className?: string;
  onClick?: () => void;
}

// Safari doesn't reliably show transparency in WebM, so it gets the still artwork with CSS movement.
const canPlayAlphaWebm = typeof navigator !== 'undefined' && !/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

export const Mascot = memo(function Mascot({ state = 'idle', size = 'medium', interactive, still, label, className = '', onClick }: MascotProps) {
  const px = typeof size === 'number' ? size : SIZES[size];
  const rm = useAppSelector((s) => s.rm);
  const hat = useAppSelector((s) => level(s) >= 4);
  const systemRm = useReducedMotion();
  const reduced = !!rm || !!systemRm;
  const id = useId().replace(/:/g, '');
  const [artFailed, setArtFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // The hat is an overlay, so it needs artwork that moves as one piece with it.
  const clip = !reduced && !still && !hat && canPlayAlphaWebm ? CLIPS[state] : undefined;
  const classes = ['mascot', `mascot--${state}`, still ? 'is-still' : '', clip ? 'has-clip' : '', interactive ? 'is-interactive' : '', className].filter(Boolean).join(' ');
  const style = { width: px, height: px } as CSSProperties;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

  const art = artFailed ? (
    <svg className="mascot__art" viewBox="0 0 120 120" dangerouslySetInnerHTML={{ __html: legacySvg(state, hat, id) }} />
  ) : (
    <>
      <img
        className="mascot__art"
        src={EXPRESSIONS[state] ?? BASE_IMAGE}
        alt=""
        draggable={false}
        style={clip && videoReady ? { visibility: 'hidden' } : undefined}
        onError={() => setArtFailed(true)}
      />
      {clip && (
        <video
          key={clip.src}
          className="mascot__clip"
          src={clip.src}
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          onPlaying={() => setVideoReady(true)}
          onEmptied={() => setVideoReady(false)}
          onError={() => setVideoReady(false)}
        />
      )}
      {hat && (
        <svg className="mascot__hat" viewBox="0 0 44 36" aria-hidden="true">
          <path d="M2 34L22 2l20 32z" fill="#FF8E83" />
          <circle cx="22" cy="4" r="4" fill="#FFD36E" />
        </svg>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={`${classes} mascot--button`} style={style} onClick={onClick} aria-label={label}>
        <span className="mascot__body">{art}</span>
      </button>
    );
  }
  return (
    <span className={classes} style={style} {...a11y}>
      <span className="mascot__body">{art}</span>
    </span>
  );
});
