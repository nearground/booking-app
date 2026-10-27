import ExperienceViewCard from 'components/experience-view-card/ExperienceViewCard';
import { useEffect, useState } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';
import EmptyState from 'components/empty-state/EmptyState';

const Services = () => {
  const [servicesState, setServicesState] = useState({
    isLoading: true,
    data: [],
    errors: [],
  });

  useEffect(() => {
    const loadServices = async () => {
      const servicesResponse = await networkAdapter.get('/api/services');

      if (servicesResponse && servicesResponse.data) {
        setServicesState({
          isLoading: false,
          data: servicesResponse.data.elements || [],
          errors: servicesResponse.errors || [],
        });
        return;
      }

      setServicesState({
        isLoading: false,
        data: [],
        errors: servicesResponse?.errors || ['Unable to load services'],
      });
    };

    loadServices();
  }, []);

  return (
    <div className="container mx-auto py-6 px-3 md:px-0">
      <h2 className="text-3xl font-medium text-slate-700 text-center my-2">
        Explore services
      </h2>

      {servicesState.isLoading ? (
        <div className="text-center text-slate-600 py-12">Loading services...</div>
      ) : servicesState.data.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-4">
          {servicesState.data.map((service) => (
            <ExperienceViewCard
              key={service.serviceCode}
              id={service.serviceCode}
              title={service.title}
              thumbnail={service.thumbnail}
              image={service.images?.[0]}
              subtitle={service.subtitle}
              ratings={service.ratings}
              price={service.price}
              disableNavigation={true}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[360px]">
          <EmptyState
            title="No Services Found"
            message="We can't seem to find any services right now."
          />
        </div>
      )}
    </div>
  );
};

export default Services;
