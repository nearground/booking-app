import { EXPERIENCE_TEMPLATE_COPY } from './experienceDetailsCopy';

export const EXPERIENCE_DETAILS_TEMPLATES = [
  { value: 'default', label: 'Default — gallery and calendar' },
  { value: 'event', label: 'Event — single date, paid or free admission' },
  { value: 'food-tour', label: 'Food tour — video and featured reviews' },
];

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isMediaKey = (value, extensions) =>
  typeof value === 'string' && value.length <= 512 &&
  /^users\/[1-9]\d*\/[a-z0-9-]{1,40}\/[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(value) &&
  extensions.includes(value.split('.').pop());

export function resolveDetailsMetadata(value) {
  const fallback = { version: 1, template: 'default', overrides: {} };
  if (!isRecord(value) || value.version !== 1) return fallback;
  const template = value.template === 'party' ? 'event' : value.template;
  if (!EXPERIENCE_DETAILS_TEMPLATES.some(({ value: supported }) => supported === template)) return fallback;
  const input = isRecord(value.overrides) ? value.overrides : {};
  const overrides = {};
  if (typeof input.commentsDisabled === 'boolean') overrides.commentsDisabled = input.commentsDisabled;
  const copyKeys = new Set(Object.values(EXPERIENCE_TEMPLATE_COPY).flat().map(({ key }) => key));
  if (isRecord(input.copy)) {
    const copy = Object.fromEntries(Object.entries(input.copy).filter(
      ([key, text]) => copyKeys.has(key) && typeof text === 'string' && text.length <= 500
    ));
    if (Object.keys(copy).length) overrides.copy = copy;
  }
  if (isMediaKey(input.heroVideoKey, ['mp4'])) overrides.heroVideoKey = input.heroVideoKey;
  if (isMediaKey(input.heroPosterKey, ['jpg', 'jpeg', 'png', 'webp', 'avif'])) overrides.heroPosterKey = input.heroPosterKey;
  if (Array.isArray(input.pinnedCommentIds)) {
    overrides.pinnedCommentIds = [...new Set(input.pinnedCommentIds.filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, 3);
  }
  return { version: 1, template, overrides };
}

export function resolveDetailsMedia(metadata) {
  const { overrides } = resolveDetailsMetadata(metadata);
  const url = (key) => key ? `/api/media/object/${key.split('/').map(encodeURIComponent).join('/')}` : null;
  return { heroVideoUrl: url(overrides.heroVideoKey), heroPosterUrl: url(overrides.heroPosterKey) };
}

export function selectPinnedComments(comments, metadata) {
  const ids = resolveDetailsMetadata(metadata).overrides.pinnedCommentIds || [];
  return ids.map((id) => (Array.isArray(comments) ? comments : []).find(
    (comment) => comment.id === id && !comment.ParentId && Number(comment.stars) === 5
  )).filter(Boolean).slice(0, 3);
}
