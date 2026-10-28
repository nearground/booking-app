import { useEffect, useMemo, useState } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';
import { resolveAppUrl } from './organizationSiteResolver';
import OrganizationHero from './OrganizationHero';
import ChatSidebar from 'components/chat-sidebar/ChatSidebar';
import ExperienceDetails from '../experience-details/ExperienceDetails';
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

const FOOD_TOUR_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'pitillal', label: 'Pitillal Food Tour', title: 'Pitillal Food Tours' },
  { id: 'old-town', label: 'Old Town Taco Tour', title: 'Old Town Taco Tour' },
];

const FoodToursContent = ({ organization, experiences }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [experienceDetail, setExperienceDetail] = useState({ status: 'idle', data: null });
  const activeTabConfig = FOOD_TOUR_TABS.find((tab) => tab.id === activeTab);
  const activeExperience = activeTabConfig?.title
    ? experiences.find((experience) => experience.title === activeTabConfig.title)
    : null;

  useEffect(() => {
    if (!activeExperience?.id) {
      setExperienceDetail({ status: 'idle', data: null });
      return undefined;
    }

    let active = true;
    setExperienceDetail({ status: 'loading', data: null });
    networkAdapter.get(`/api/experiences/${activeExperience.id}`)
      .then((response) => {
        if (!active) return;
        if (!response?.ok || response.errors?.length || !response.data) {
          setExperienceDetail({ status: 'error', data: null });
          return;
        }
        setExperienceDetail({ status: 'loaded', data: response.data });
      })
      .catch(() => {
        if (active) setExperienceDetail({ status: 'error', data: null });
      });

    return () => { active = false; };
  }, [activeExperience?.id]);

  const handleTabKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % FOOD_TOUR_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index + FOOD_TOUR_TABS.length - 1) % FOOD_TOUR_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = FOOD_TOUR_TABS.length - 1;
    else return;

    event.preventDefault();
    setActiveTab(FOOD_TOUR_TABS[nextIndex].id);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[nextIndex].focus();
  };

  return (
    <>
      <nav className="org-site-tabs" aria-label="Food Tours pages">
        <div className="org-site-tab-list" role="tablist">
          {FOOD_TOUR_TABS.map((tab, index) => (
            <button
              key={tab.id}
              id={`food-tours-tab-${tab.id}`}
              className="org-site-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls="food-tours-tabpanel"
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      {activeTab === 'home' ? (
        <OrganizationHero organization={organization} experiences={experiences} />
      ) : null}
      <section
        className={`org-site-main${activeTab === 'home' ? '' : ' org-site-experience-panel'}`}
        id="organization-experiences"
        role="tabpanel"
        aria-labelledby={`food-tours-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === 'home' ? (
          <>
            {organization.about ? <p className="org-site-about">{organization.about}</p> : null}
            <div className="org-site-section-heading">
              <div><p className="org-site-eyebrow">Make a little room for adventure</p><h2 className="org-site-section-title">Upcoming experiences</h2></div>
              {experiences.length ? <span className="org-site-count">{experiences.length} {experiences.length === 1 ? 'experience' : 'experiences'} to discover</span> : null}
            </div>
            <ExperienceCards experiences={experiences} />
          </>
        ) : activeExperience && experienceDetail.status === 'loading' ? (
          <p className="org-site-empty" role="status">Loading {activeExperience.title}...</p>
        ) : activeExperience && experienceDetail.status === 'error' ? (
          <p className="org-site-empty" role="alert">Unable to load this tour right now. Please try again later.</p>
        ) : activeExperience && experienceDetail.data ? (
          <div className="org-site-tour-details">
            <ExperienceDetails previewData={experienceDetail.data} isOrganizationEmbed />
          </div>
        ) : (
          <p className="org-site-empty">This tour is not available right now. Please check back soon.</p>
        )}
      </section>
    </>
  );
};

const TemplateLayout = ({ organization, experiences }) => {
  const template = safeTemplate(organization.layoutTemplate);
  const style = {
    '--org-primary': safeColor(organization.primaryColor, '#0f766e'),
    '--org-accent': safeColor(organization.accentColor, '#f59e0b'),
    '--org-font': fontFamilies[organization.font] || fontFamilies.system,
  };
  return (
    <main className={`org-site org-site-${template}`} style={style}>
      {organization.slug === 'food-tours' ? (
        <FoodToursContent organization={organization} experiences={experiences} />
      ) : (
        <>
          <OrganizationHero organization={organization} experiences={experiences} />
          <section className="org-site-main" id="organization-experiences">
            {organization.about ? <p className="org-site-about">{organization.about}</p> : null}
            <div className="org-site-section-heading">
              <div><p className="org-site-eyebrow">Make a little room for adventure</p><h2 className="org-site-section-title">Upcoming experiences</h2></div>
              {experiences.length ? <span className="org-site-count">{experiences.length} {experiences.length === 1 ? 'experience' : 'experiences'} to discover</span> : null}
            </div>
            <ExperienceCards experiences={experiences} />
          </section>
        </>
      )}
      <section className="org-site-main">
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

  return (
    <>
      {content}
      <ChatSidebar />
    </>
  );
};

export { TemplateLayout };
export default OrganizationSite;
