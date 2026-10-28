import { resolveMediaUrl } from './media-storage.js';

const buildPublicOrganizationSitePayload = (organization) => {
  const org = organization.toJSON ? organization.toJSON() : organization;
  const experiences = (org.Experiences || []).map((experience) => {
    const sessions = experience.ScheduledExperiences || [];
    const firstSession = sessions.reduce((earliest, session) =>
      !earliest || new Date(session.dateTime) < new Date(earliest.dateTime) ? session : earliest, null);
    return {
      id: experience.id,
      title: experience.title,
      subtitle: experience.subtitle || '',
      description: experience.description || '',
      thumbnail: resolveMediaUrl(experience.thumbnail),
      images: Array.isArray(experience.images)
        ? [...new Set(experience.images.filter((image) => typeof image === 'string' && image.trim()).map((image) => resolveMediaUrl(image)))]
        : [],
      duration: experience.duration || null,
      nextDateTime: firstSession?.dateTime || null,
      soldOut: sessions.length > 0 && sessions.every((session) => Number(session.availableSpots) <= 0),
      url: `/experience/${experience.id}`,
    };
  });
  return {
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: resolveMediaUrl(org.logoMediaKey),
      coverUrl: resolveMediaUrl(org.coverMediaKey),
      coverMediaType: org.coverMediaType || 'image',
      primaryColor: org.primaryColor || '#0f766e',
      accentColor: org.accentColor || '#f59e0b',
      font: org.font || 'system',
      tagline: org.tagline || '',
      about: org.about || '',
      socialLinks: org.socialLinks || {},
      contactLinks: org.contactLinks || {},
      layoutTemplate: org.layoutTemplate || 'classic',
    },
    experiences,
  };
};

export { buildPublicOrganizationSitePayload };
