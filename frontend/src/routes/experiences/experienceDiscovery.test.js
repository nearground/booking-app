import { filterExperiencesForTab } from './experienceDiscovery';

describe('filterExperiencesForTab', () => {
  const experiences = [
    { id: 1, title: 'Food tour', detailsMetadata: { template: 'food-tour' } },
    { id: 2, title: 'Legacy listing' },
    { id: 3, title: 'Party', detailsMetadata: { template: 'event' } },
  ];

  test('keeps event-template experiences only in Events', () => {
    expect(filterExperiencesForTab(experiences, 'events').map(({ id }) => id)).toEqual([3]);
    expect(filterExperiencesForTab(experiences, 'experiences').map(({ id }) => id)).toEqual([1, 2]);
  });
});
