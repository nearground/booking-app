import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { networkAdapter } from 'services/NetworkAdapter';
import CreateExperience from 'routes/create-experience/CreateExperience';

const EditExperience = () => {
  const { experienceId } = useParams();
  const navigate = useNavigate();
  const [experienceData, setExperienceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadExperience = async () => {
      const id = Number(experienceId);
      if (!Number.isInteger(id) || id <= 0) {
        setError('Invalid experience ID.');
        setIsLoading(false);
        return;
      }

      const response = await networkAdapter.get(`/api/experiences/manage/${id}`);

      if (response?.errors?.length) {
        setError(response.errors[0] || 'Failed to load experience.');
        setIsLoading(false);
        return;
      }

      if (!response?.data?.experience) {
        setError('Experience not found.');
        setIsLoading(false);
        return;
      }

      setExperienceData(response.data.experience);
      setIsLoading(false);
    };

    loadExperience();
  }, [experienceId]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 min-h-[700px] flex items-center justify-center">
        <p className="text-slate-500">Loading experience…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 min-h-[700px]">
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">
          {error}
        </div>
        <button
          type="button"
          className="px-4 py-2 rounded border border-slate-300 text-slate-700"
          onClick={() => navigate('/organizer-profile?tab=Experiences', { replace: true })}
        >
          Back to Experiences
        </button>
      </div>
    );
  }

  return <CreateExperience mode="edit" experienceData={experienceData} />;
};

export default EditExperience;
