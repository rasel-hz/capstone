import { JOURNEYS, SCENES } from './catalog';
import type { JourneyId } from '../../types';

// The markup comes only from the constants in catalog.ts, never from user input.
export function JourneyScene({ id }: { id: JourneyId }) {
  const [a, b] = JOURNEYS.find((j) => j.id === id)!.g.split(',');
  const html = `<defs><linearGradient id="q${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="200" height="90" fill="url(#q${id})"/>${SCENES[id]}`;
  return <svg viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
}
