import { faStar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';

const isRenderableImageUrl = (value) => /^(https?:\/\/|blob:|data:image\/|\/)/i.test(String(value || '').trim());

const ExperienceViewCard = (props) => {
  const { id, thumbnail, image, title, price, commentsCount, ratings, disableNavigation = false } = props;
  const normalizedPrice = Number(price || 0).toFixed(2);
  const normalizedRating = Number(ratings || 0).toFixed(2);
  const navigate = useNavigate();
  // Only use thumbnail for tile image, fallback to placeholder if invalid
  const cardImage = isRenderableImageUrl(thumbnail)
    ? thumbnail
    : '/images/hotel-room-placeholder.png';

  return (
    <div
      className={`p-2 md:p-3 ${disableNavigation ? '' : 'cursor-pointer'}`}
      data-testid="experience-card"
      onClick={() => {
        if (!disableNavigation) {
          navigate(`/experience/${id}`);
        }
      }}
    >
      <img
        src={cardImage}
        alt={image?.accessibleText || title}
        className="w-full aspect-square object-cover rounded-lg"
      />
      <h4 className="text-sm md:text-base font-semibold text-slate-700 mt-2 line-clamp-1">
        {title}
      </h4>
      <p className="text-xs md:text-sm text-slate-700 mt-2">
        From ${normalizedPrice}/USD per guest,{' '}
        <FontAwesomeIcon icon={faStar} className="text-amber-500" />{' '}
        {normalizedRating} ({commentsCount} reviews)
      </p>
    </div>
  );
};

export default ExperienceViewCard;
