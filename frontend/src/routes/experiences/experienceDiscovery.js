export const filterExperiencesForTab = (experiences, tab) => {
  const items = Array.isArray(experiences) ? experiences : [];
  return items.filter((experience) => {
    const isEvent = experience.detailsMetadata?.template === 'event';
    return tab === 'events' ? isEvent : !isEvent;
  });
};
