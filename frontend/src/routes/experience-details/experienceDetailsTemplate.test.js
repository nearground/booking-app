import { resolveDetailsMetadata, resolveDetailsMedia, selectPinnedComments } from './experienceDetailsTemplate';

describe('experience template resolution', () => {
  test('normalizes legacy party metadata to the event template', () => {
    expect(resolveDetailsMetadata({ version: 1, template: 'party', overrides: {} }))
      .toEqual({ version: 1, template: 'event', overrides: {} });
  });
  test('preserves the comments-disabled setting', () => {
    expect(resolveDetailsMetadata({ version: 1, template: 'food-tour', overrides: { commentsDisabled: true } }))
      .toEqual({ version: 1, template: 'food-tour', overrides: { commentsDisabled: true } });
  });
  test.each([undefined, null, {}, { version: 2, template: 'event' }, { version: 1, template: 'injected' }])(
    'retains default layout for unsupported metadata %j', (value) => {
      expect(resolveDetailsMetadata(value)).toEqual({ version: 1, template: 'default', overrides: {} });
    }
  );
  test('drops arbitrary styles, URLs and personal fields', () => {
    expect(resolveDetailsMetadata({ version: 1, template: 'event', overrides: {
      css: 'body{}', checkedInPeople: [{ email: 'private@example.test' }],
      heroVideoKey: 'data:text/html,unsafe', heroPosterKey: 'https://example.test/a.jpg',
    } })).toEqual({ version: 1, template: 'event', overrides: {} });
  });
  test('resolves uploaded media to trusted same-origin paths', () => {
    expect(resolveDetailsMedia({ version: 1, template: 'food-tour', overrides: {
      heroVideoKey: 'users/1/asset/123-abc.mp4',
    } })).toEqual({ heroVideoUrl: '/api/media/object/users/1/asset/123-abc.mp4', heroPosterUrl: null });
  });
  test('retains validated custom text for each template', () => {
    const metadata = { version: 1, template: 'event', overrides: { copy: {
      paidBadge: 'Tickets from $10',
      storyHeading: 'A new event heading',
      unknown: 'ignored',
      descriptionFallback: 42,
    } } };
    expect(resolveDetailsMetadata(metadata).overrides.copy).toEqual({
      paidBadge: 'Tickets from $10',
      storyHeading: 'A new event heading',
    });
  });
  test('only pins matching five-star top-level comments in configured order', () => {
    const comments = [{ id: 1, stars: 4 }, { id: 2, stars: 5, ParentId: 7 }, { id: 3, stars: '5' }];
    expect(selectPinnedComments(comments, { version: 1, template: 'food-tour', overrides: {
      pinnedCommentIds: [3, 1, 2],
    } })).toEqual([comments[2]]);
  });
});
