import HotelBookingDetailsCard from '../hotel-booking-details-card/HotelBookingDetailsCard';
import UserComments from '../user-comments/UserComments';
import { networkAdapter } from 'services/NetworkAdapter';
import React, { useEffect, useState } from 'react';
import ReactImageGallery from 'react-image-gallery';

const HotelDetailsViewCard = ({ hotelDetails }) => {
  const normalizedHotelDetails = {
    hotelCode: hotelDetails?.hotelCode || hotelDetails?.id || '',
    title: hotelDetails?.title || '',
    subtitle: hotelDetails?.subtitle || '',
    discount: hotelDetails?.discount || '',
    images: Array.isArray(hotelDetails?.images) ? hotelDetails.images : [],
    description: Array.isArray(hotelDetails?.description)
      ? hotelDetails.description
      : hotelDetails?.description
        ? [hotelDetails.description]
        : [],
    benefits: Array.isArray(hotelDetails?.benefits) ? hotelDetails.benefits : [],
  };

  const images = normalizedHotelDetails.images.map((image) => ({
    original: image.imageUrl,
    thumbnail: image.imageUrl,
    thumbnailClass: 'h-[80px]',
    thumbnailLoading: 'lazy',
  }));

  const [commentData, setCommentData] = useState({
    isLoading: true,
    data: [],
  });
  const [currentCommentsPage, setCurrentCommentPage] = useState(1);

  const handlePageChange = (page) => {
    setCurrentCommentPage(page);
  };

  const handlePreviousPageChange = () => {
    setCurrentCommentPage((prev) => {
      if (prev <= 1) return prev;
      return prev - 1;
    });
  };

  const handleNextPageChange = () => {
    setCurrentCommentPage((prev) => {
      if (prev >= commentData.pagination.totalPages) return prev;
      return prev + 1;
    });
  };

  useEffect(() => {
    setCommentData({
      isLoading: true,
      data: [],
    });
    const fetchHotelComments = async () => {
      const response = await networkAdapter.get(
        `/api/hotel/${normalizedHotelDetails.hotelCode}/comments`,
        {
          currentPage: currentCommentsPage,
        }
      );
      if (response && response.data) {
        setCommentData({
          isLoading: false,
          data: response.data.elements,
          metadata: response.metadata,
          pagination: response.paging,
        });
      }
    };
    fetchHotelComments();
  }, [normalizedHotelDetails.hotelCode, currentCommentsPage]);

  return (
    <div className="flex items-start justify-center flex-wrap md:flex-nowrap container mx-auto p-4">
      <div className="w-[800px] bg-white shadow-lg rounded-lg overflow-hidden">
        <div>
          <div className="relative w-full">
            <ReactImageGallery
              items={images}
              showPlayButton={false}
              showFullscreenButton={false}
            />
            {normalizedHotelDetails.discount && (
              <div className="absolute top-0 right-0 m-4 px-2 py-1 bg-yellow-500 text-white font-semibold text-xs rounded">
                {normalizedHotelDetails.discount} OFF
              </div>
            )}
          </div>
          <div className="p-4">
            <h2 className="text-3xl font-semibold text-gray-800 mb-2">
              {normalizedHotelDetails.title}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {normalizedHotelDetails.subtitle}
            </p>
            <div className="mt-2 space-y-2">
              {normalizedHotelDetails.description.map((line, index) => (
                <p key={index} className="text-gray-700">
                  {line}
                </p>
              ))}
            </div>
            <div className="flex justify-between items-center mt-4">
              <div>
                <p className="text-sm text-gray-600">
                  {normalizedHotelDetails.benefits.join(' | ')}
                </p>
              </div>
            </div>
          </div>
        </div>
        <UserComments
          commentData={commentData}
          handlePageChange={handlePageChange}
          handlePreviousPageChange={handlePreviousPageChange}
          handleNextPageChange={handleNextPageChange}
        />
      </div>
      <HotelBookingDetailsCard hotelCode={normalizedHotelDetails.hotelCode} />
    </div>
  );
};

export default HotelDetailsViewCard;
