import { useEffect, useMemo, useState } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';
import { resolveAppUrl } from './organizationSiteResolver';
import OrganizationHero from './OrganizationHero';
import './organization-site.scss';

const fontFamilies = {
  system: 'system-ui, sans-serif',
  inter: 'Inter, system-ui, sans-serif',
  roboto: 'Roboto, Arial, sans-serif',
  lato: 'Lato, Arial, sans-serif',
  montserrat: 'Montserrat, Arial, sans-serif',
};

const safeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
const safeTemplate = (value) => ['classic', 'editorial', 'immersive'].includes(value) ? value : 'classic';

const ExperienceCards = ({ experiences }) => experiences.length ? (
  <div className="org-site-cards">
    {experiences.map((experience) => (
      <article className="org-site-card" key={experience.id}>
        {experience.thumbnail ? <img src={experience.thumbnail} alt="" className="org-site-card-image" loading="lazy" /> : <div className="org-site-card-placeholder" aria-hidden="true" />}
        <div className="org-site-card-content">
          {experience.soldOut ? <span className="org-site-sold-out">Sold out</span> : null}
          <h2>{experience.title}</h2>
          {experience.subtitle ? <p className="org-site-subtitle">{experience.subtitle}</p> : null}
          {experience.description ? <p>{experience.description}</p> : null}
          {experience.nextDateTime ? <p className="org-site-date">Next session: {new Date(experience.nextDateTime).toLocaleDateString()}</p> : null}
          <a className="org-site-button" href={resolveAppUrl(`/experience/${experience.id}`)}>View experience</a>
        </div>
      </article>
    ))}
  </div>
) : <p className="org-site-empty">No upcoming experiences are available right now. Please check back soon.</p>;

const TemplateLayout = ({ organization, experiences }) => {
  const template = safeTemplate(organization.layoutTemplate);
  const style = {
    '--org-primary': safeColor(organization.primaryColor, '#0f766e'),
    '--org-accent': safeColor(organization.accentColor, '#f59e0b'),
    '--org-font': fontFamilies[organization.font] || fontFamilies.system,
  };
  return (
    <main className={`org-site org-site-${template}`} style={style}>
      <OrganizationHero organization={organization} experiences={experiences} />
      <section className="org-site-main">
        {organization.about ? <p className="org-site-about">{organization.about}</p> : null}
        <div className="org-site-section-heading" id="organization-experiences">
          <div><p className="org-site-eyebrow">Make a little room for adventure</p><h2 className="org-site-section-title">Upcoming experiences</h2></div>
          {experiences.length ? <span className="org-site-count">{experiences.length} {experiences.length === 1 ? 'experience' : 'experiences'} to discover</span> : null}
        </div>
        <ExperienceCards experiences={experiences} />
        {Object.keys(organization.socialLinks || {}).length || Object.keys(organization.contactLinks || {}).length ? (
          <footer className="org-site-footer">
            {Object.entries(organization.socialLinks || {}).map(([label, url]) => url ? <a key={`social-${label}`} href={url} target="_blank" rel="noreferrer">{label}</a> : null)}
            {Object.entries(organization.contactLinks || {}).map(([label, value]) => value ? <span key={`contact-${label}`}>{label === 'email' ? <a href={`mailto:${value}`}>{value}</a> : label === 'phone' ? <a href={`tel:${value}`}>{value}</a> : <a href={value} target="_blank" rel="noreferrer">{label}</a>}</span> : null)}
          </footer>
        ) : null}
      </section>
      <div className="org-site-powered">Experiences by <a href={resolveAppUrl('/experiences')}>Puerto Vallarta Today</a></div>
    </main>
  );
};

const OrganizationSite = ({ slug: providedSlug }) => {
  const slug = providedSlug || '';
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    networkAdapter.get(`/api/organization-sites/${encodeURIComponent(slug)}`).then((response) => {
      if (!active) return;
      if (!response.ok || response.errors?.length || !response.data?.organization) setError(true);
      else setSiteData(response.data);
      setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  const content = useMemo(() => {
    if (loading) return <main className="org-site-state" aria-live="polite">Loading organization site�</main>;
    if (error || !siteData) return <main className="org-site-state"><h1>Organization site not found</h1><p>This organization site is unavailable.</p><a href={resolveAppUrl('/experiences')}>Browse experiences</a></main>;
    return <TemplateLayout organization={siteData.organization} experiences={siteData.experiences || []} />;
  }, [error, loading, siteData]);

  return content;
};

export { TemplateLayout };
export default OrganizationSite;
