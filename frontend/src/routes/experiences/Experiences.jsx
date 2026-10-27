import HeroCover from 'components/hero-cover/HeroCover';
import PopularLocations from 'components/popular-locations/PopularLocations';
import { networkAdapter } from 'services/NetworkAdapter';
import { useState, useEffect, useCallback } from 'react';
import { MAX_GUESTS_INPUT_VALUE } from 'utils/constants';
import ResultsContainer from 'components/results-container/ResultsContainer';
import { formatDate } from 'utils/date-helpers';
import { useNavigate } from 'react-router-dom';
import _debounce from 'lodash/debounce';

/**
 * Experiences component that renders the main page of the application.
 * It includes a navigation bar, hero cover, popular locations, results container, and footer.
 */
const Experiences = () => {
  const navigate = useNavigate();

  // State variables
  const [isDatePickerVisible, setisDatePickerVisible] = useState(false);
  const [locationInputValue, setLocationInputValue] = useState('Puerto Vallarta');
  const [numGuestsInputValue, setNumGuestsInputValue] = useState('');
  const [popularDestinationsData, setPopularDestinationsData] = useState({
    isLoading: true,
    data: [],
    errors: [],
  });
  const [experiencesResults, setHotelsResults] = useState({
    isLoading: true,
    data: [],
    errors: [],
  });

  // State for storing available cities
  const [availableCities, setAvailableCities] = useState([]);

  const [filteredTypeheadResults, setFilteredTypeheadResults] = useState([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceFn = useCallback(_debounce(queryResults, 1000), []);

  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: 'selection',
    },
  ]);

  const onDatePickerIconClick = () => {
    setisDatePickerVisible(!isDatePickerVisible);
  };

  const onLocationChangeInput = async (newValue) => {
    setLocationInputValue(newValue);
    // Debounce the queryResults function to avoid making too many requests
    debounceFn(newValue, availableCities);
  };

  /**
   * Queries the available cities based on the user's input.
   * @param {string} query - The user's input.
   * @returns {void}
   *
   */
  function queryResults(query, availableCities) {
    const filteredResults = availableCities.filter((city) =>
      city.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredTypeheadResults(filteredResults);
  }

  const onNumGuestsInputChange = (numGuests) => {
    if (
      (numGuests < MAX_GUESTS_INPUT_VALUE && numGuests > 0) ||
      numGuests === ''
    ) {
      setNumGuestsInputValue(numGuests);
    }
  };

  const onDateChangeHandler = (ranges) => {
    setDateRange([ranges.selection]);
  };

  /**
   * Handles the click event of the search button.
   * It gathers the number of guests, check-in and check-out dates, and selected city
   * from the component's state, and then navigates to the '/experiences' route with this data.
   */
  const onSearchButtonAction = () => {
    const numGuest = Number(numGuestsInputValue);
    const checkInDate = formatDate(dateRange[0].startDate) ?? '';
    const checkOutDate = formatDate(dateRange[0].endDate) ?? '';
    const city = locationInputValue;
    navigate('/experiences', {
      state: {
        numGuest,
        checkInDate,
        checkOutDate,
        city,
      },
    });
  };

  useEffect(() => {
    /**
     * Fetches initial data for the Experiences route.
     * @returns {Promise<void>} A promise that resolves when the data is fetched.
     */
    const getInitialData = async () => {
      const popularDestinationsResponse = await networkAdapter.get(
        '/api/popularDestinations'
      );
      const experiencesResultsResponse = await networkAdapter.get(
        '/api/experiences/nearbyExperiences?city=Puerto Vallarta'
      );

      const availableCitiesResponse = await networkAdapter.get(
        '/api/experiences/availableCities'
      );
      if (availableCitiesResponse && availableCitiesResponse.data) {
        setAvailableCities(availableCitiesResponse.data.elements);
      }

      if (popularDestinationsResponse && popularDestinationsResponse.data) {
        setPopularDestinationsData({
          isLoading: false,
          data: popularDestinationsResponse.data.elements,
          errors: popularDestinationsResponse.errors,
          title: 'Popular Experiences Elsewhere',
        });
      }
      if (experiencesResultsResponse && experiencesResultsResponse.data) {
        setHotelsResults({
          isLoading: false,
          data: experiencesResultsResponse.data.elements,
          errors: experiencesResultsResponse.errors,
        });
      }
    };
    getInitialData();
  }, []);

  return (
    <>
      <HeroCover
        locationInputValue={locationInputValue}
        numGuestsInputValue={numGuestsInputValue}
        locationTypeheadResults={filteredTypeheadResults}
        isDatePickerVisible={isDatePickerVisible}
        setisDatePickerVisible={setisDatePickerVisible}
        onLocationChangeInput={onLocationChangeInput}
        onNumGuestsInputChange={onNumGuestsInputChange}
        dateRange={dateRange}
        onDateChangeHandler={onDateChangeHandler}
        onDatePickerIconClick={onDatePickerIconClick}
        onSearchButtonAction={onSearchButtonAction}
      />
      <div className="container mx-auto">
        {/* <PopularLocations popularDestinationsData={popularDestinationsData} /> */}
        <div className="my-8">
          <h2 className="text-3xl font-medium text-slate-700 text-center my-2">
            Explore nearby experiences
          </h2>
          <ResultsContainer
            hotelsResults={experiencesResults} //TODO: rename prop to experiencesResults
            enableFilters={false}
            useEventCards={true}
            useExperienceCards={true}
            emptyStateTitle="No Experiences Found"
            emptyStateMessage="We can't seem to find any experiences that match your search criteria."
          />
        </div>
      </div>
    </>
  );
};

export default Experiences;
