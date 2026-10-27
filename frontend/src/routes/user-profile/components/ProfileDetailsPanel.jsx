import React, { useState, useEffect, useContext } from 'react';
import Toast from 'components/ux/toast/Toast';
import { networkAdapter } from 'services/NetworkAdapter';
import Select from 'react-select';
import { AuthContext } from 'contexts/AuthContext';

/**
 * Renders the user profile details panel.
 * @component
 * @param {Object} props - The component props.
 * @param {Object} props.userDetails - The user's details.
 * @returns {JSX.Element} The rendered component.
 * */
const ProfileDetailsPanel = ({ userDetails }) => {
  const { triggerAuthCheck } = useContext(AuthContext);

  // states to manage the edit mode and user details
  const [isEditMode, setIsEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [nationality, setNationality] = useState('');
  const [countries, setCountries] = useState([]);
  const [profilePicture, setProfilePicture] = useState('');
  const [pendingProfileFile, setPendingProfileFile] = useState(null);
  const [pendingProfilePreviewUrl, setPendingProfilePreviewUrl] = useState('');
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const [toastMessage, setToastMessage] = useState('');

  const clearToastMessage = () => {
    setToastMessage('');
  };

  const handleEditClick = () => {
    setIsEditMode(!isEditMode);
  };

  const handleCancelClick = () => {
    setPendingProfileFile(null);
    setPendingProfilePreviewUrl('');
    setProfilePicture(userDetails?.profilePicture || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowPasswordFields(false);
    setIsEditMode(!isEditMode);
  };

  const uploadProfileImageToR2 = async (file) => {
    const uploadResponse = await networkAdapter.upload('/api/media/upload', file, {
      method: 'PUT',
      params: {
        ownerType: 'user',
        ownerId: String(userDetails.id),
        kind: 'profile',
      },
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload profile image');
    }

    const uploadData = uploadResponse;
    if (uploadData?.errors?.length || !uploadData?.data?.objectKey) {
      throw new Error(uploadData?.errors?.[0] || 'Failed to upload profile image');
    }

    return uploadData.data.objectKey;
  };

  const handleProfilePictureFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type?.startsWith('image/')) {
      setToastMessage({
        type: 'error',
        message: 'Please select a valid image file.',
      });
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setPendingProfileFile(selectedFile);
    setPendingProfilePreviewUrl(previewUrl);
  };

  /**
   * Handles the save button click event.
   * Updates the user details and sets the edit mode to false.
   * */
  const handleSaveClick = async () => {
    // check if newstate is different from old state — include password fields
    if (
      firstName === userDetails.firstName &&
      lastName === userDetails.lastName &&
      phoneNumber === userDetails.phoneNumber &&
      dateOfBirth === (userDetails.dateOfBirth || '') &&
      nationality === userDetails.country &&
      !pendingProfileFile &&
      !currentPassword &&
      !newPassword &&
      !confirmNewPassword
    ) {
      setIsEditMode(false);
      return;
    }

    let nextProfilePicture = profilePicture || null;

    if (pendingProfileFile) {
      try {
        setIsUploadingProfilePicture(true);
        nextProfilePicture = await uploadProfileImageToR2(pendingProfileFile);
      } catch (_error) {
        setToastMessage({
          type: 'error',
          message: 'Profile picture upload failed. Please try again.',
        });
        setIsUploadingProfilePicture(false);
        return;
      }
      setIsUploadingProfilePicture(false);
    }

    const updatedUserDetails = {
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth: dateOfBirth || null,
      country: nationality,
      profilePicture: nextProfilePicture,
    };
    // If user provided password fields, validate and call password endpoint first
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[$@#&!]).{8,}$/;
    if (showPasswordFields && [currentPassword, newPassword, confirmNewPassword].some((s) => typeof s === 'string' && s.trim().length > 0)) {
      // Require all three password fields to be filled (non-blank) before attempting update
      if (
        !currentPassword ||
        !newPassword ||
        !confirmNewPassword ||
        currentPassword.trim() === '' ||
        newPassword.trim() === '' ||
        confirmNewPassword.trim() === ''
      ) {
        setToastMessage({ type: 'error', message: 'Please fill current, new, and confirm password fields to change your password.' });
        return;
      }

      if (newPassword !== confirmNewPassword) {
        setToastMessage({ type: 'error', message: 'New passwords do not match.' });
        return;
      }
      if (!passwordRegex.test(newPassword)) {
        setToastMessage({
          type: 'error',
          message:
            'New password must be at least 8 characters and include upper, lower, number, and special character.',
        });
        return;
      }

      const pwResp = await networkAdapter.put('/api/users/password', {
        currentPassword,
        newPassword,
      });

      if (!(pwResp && (!pwResp.errors || pwResp.errors.length === 0))) {
        setToastMessage({ type: 'error', message: pwResp?.errors?.[0] || 'Password update failed.' });
        return;
      }

      // clear password fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordFields(false);
      setToastMessage({ type: 'success', message: 'Password updated successfully.' });
    }

    // Call the API to update the user details
    const response = await networkAdapter.patch('/api/users/update-profile', updatedUserDetails);

    if (response && (!response.errors || response.errors.length === 0)) {
      setProfilePicture(nextProfilePicture || '');
      setPendingProfileFile(null);
      setPendingProfilePreviewUrl('');

      await triggerAuthCheck();

      setToastMessage({
        type: 'success',
        message: 'Profile updated successfully.',
      });
    } else {
      // revert to original state
      setFirstName(userDetails.firstName);
      setLastName(userDetails.lastName);
      setPhoneNumber(userDetails.phoneNumber || '');
      setDateOfBirth(userDetails.dateOfBirth || '');
      setNationality(userDetails.country);
      setPendingProfileFile(null);
      setPendingProfilePreviewUrl('');
      setToastMessage({
        type: 'error',
        message:
          response?.errors?.[0] ||
          'Oops, something went wrong. Please try again later.',
      });
    }

    setIsEditMode(false);
  };

  // effect to set initial state of user details
  useEffect(() => {
    if (userDetails) {
      setFirstName(userDetails.firstName || '');
      setLastName(userDetails.lastName || '');
      setEmail(userDetails.email || '');
      setPhoneNumber(userDetails.phoneNumber || '');
      setNationality(userDetails.country || '');
      setIsEmailVerified(userDetails.isEmailVerified || '');
      setIsPhoneVerified(userDetails.isPhoneVerified || '');
      setDateOfBirth(userDetails.dateOfBirth || '');
      setProfilePicture(userDetails.profilePicture || '');
    }
  }, [userDetails]);

  useEffect(() => {
    return () => {
      if (pendingProfilePreviewUrl) {
        URL.revokeObjectURL(pendingProfilePreviewUrl);
      }
    };
  }, [pendingProfilePreviewUrl]);

  useEffect(() => {
    const fetchCountries = async () => {
      const countriesData = await networkAdapter.get('/api/misc/countries');
      const countryElements = Array.isArray(countriesData?.data?.elements)
        ? countriesData.data.elements
        : [];

      if (countryElements.length > 0) {
        const mappedValues = countryElements.map((country) => ({
          label: country.name,
          value: country.name,
        }));
        setCountries(mappedValues);
      } else {
        setCountries([]);
      }
    };
    fetchCountries();
  }, []);

  return (
    <div className="bg-white shadow sm:rounded-lg flex flex-col">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-xl leading-6 font-medium text-gray-900">
          Personal details
        </h3>
        <p className="mt-1 max-w-2xl text-gray-500">
          Keep your details current to ensure seamless communication and
          services
        </p>
      </div>
      <div className="border-t border-gray-200">
        <dl>
          {isEditMode ? (
            // Editable fields
            <>
              {/* Hidden dummy inputs to deter browser autofill */}
              <div style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }} aria-hidden>
                <input type="text" name="__fake_username" autoComplete="username" />
                <input type="password" name="__fake_password" autoComplete="current-password" />
              </div>
              <ProfilePictureField
                label="Profile Picture"
                currentImage={pendingProfilePreviewUrl || profilePicture}
                onFileChange={handleProfilePictureFileChange}
                isUploading={isUploadingProfilePicture}
              />
              <TextField
                label="Email address"
                type="email"
                value={email}
                onChange={setEmail}
                disabled={true}
                autoComplete="off"
              />
              <TextField
                label="First Name"
                value={firstName}
                onChange={setFirstName}
              />

              <TextField
                label="Last Name"
                value={lastName}
                onChange={setLastName}
              />
              <TextField
                label="Phone number"
                type="tel"
                value={phoneNumber}
                onChange={setPhoneNumber}
              />
              <TextField
                label="Date of birth"
                type="date"
                value={dateOfBirth}
                onChange={setDateOfBirth}
              />
              <div className="relative">
                <TextField
                  label="Country"
                  value={nationality}
                  onChange={setNationality}
                  isSelectable={true}
                  selectableData={countries}
                />
                <div className="bg-white px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-500">Change password</dt>
                  <dd className="mt-1 sm:mt-0 sm:col-span-2 text-sm text-gray-600">
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields(!showPasswordFields)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {showPasswordFields ? 'Cancel password change' : 'Change password'}
                    </button>
                  </dd>
                </div>
                {showPasswordFields && (
                  <>
                        <TextField
                          label="Current password"
                          type="password"
                          value={currentPassword}
                          onChange={setCurrentPassword}
                          autoComplete="current-password"
                        />
                        <TextField
                          label="New password"
                          type="password"
                          value={newPassword}
                          onChange={setNewPassword}
                          autoComplete="new-password"
                        />
                        <TextField
                          label="Confirm new password"
                          type="password"
                          value={confirmNewPassword}
                          onChange={setConfirmNewPassword}
                          autoComplete="new-password"
                        />
                  </>
                )}
              </div>
            </>
          ) : (
            // Display fields
            <>
              <DisplayImageField
                label="Profile Picture"
                imageUrl={profilePicture}
                fallbackText="No profile picture uploaded"
              />
              <DisplayField label="First Name" value={firstName} />
              <DisplayField label="Last Name" value={lastName} />
              <DisplayField
                label="Email address"
                value={email}
                verified={isEmailVerified}
              />
              <DisplayField
                label="Phone number"
                value={phoneNumber || 'Add your phone number'}
                verified={isPhoneVerified}
              />
              <DisplayField
                label="Date of birth"
                value={dateOfBirth || 'Enter your date of birth'}
              />
              <DisplayField label="Nationality" value={nationality} />
            </>
          )}
        </dl>
      </div>
      <div className="flex justify-between px-4 py-3 bg-gray-50 text-right sm:px-6">
        {isEditMode ? (
          <>
            <button
              onClick={handleCancelClick}
              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveClick}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Save
            </button>
          </>
        ) : (
          <button
            onClick={handleEditClick}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Edit
          </button>
        )}
      </div>
      {toastMessage && (
        <div className="m-2">
          <Toast
            type={toastMessage.type}
            message={toastMessage.message}
            dismissError={clearToastMessage}
          />
        </div>
      )}
    </div>
  );
};

const DisplayField = ({ label, value, verified }) => (
  <div
    className={`bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 ${
      verified ? 'bg-gray-50' : ''
    }`}
  >
    <dt className="font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-gray-900 sm:mt-0 sm:col-span-2">
      {value}{' '}
      {verified && <span className="text-green-500 font-medium">Verified</span>}
    </dd>
  </div>
);

const DisplayImageField = ({ label, imageUrl, fallbackText }) => (
  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
    <dt className="font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-gray-900 sm:mt-0 sm:col-span-2">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Profile"
          className="h-16 w-16 rounded-full object-cover border border-slate-200"
        />
      ) : (
        <span>{fallbackText}</span>
      )}
    </dd>
  </div>
);

const ProfilePictureField = ({ label, currentImage, onFileChange, isUploading }) => (
  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
    <dt className="font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-gray-900 sm:mt-0 sm:col-span-2">
      {currentImage ? (
        <img
          src={currentImage}
          alt="Profile preview"
          className="h-16 w-16 rounded-full object-cover border border-slate-200 mb-3"
        />
      ) : null}
      <input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="block w-full text-sm text-slate-700"
      />
      <p className="text-xs text-slate-500 mt-2">
        {isUploading ? 'Uploading image...' : 'Upload JPG, PNG, WEBP, or GIF.'}
      </p>
    </dd>
  </div>
);

const TextField = ({
  label,
  value,
  onChange,
  type = 'text',
  isSelectable,
  selectableData,
  disabled = false,
  autoComplete = undefined,
}) => (
  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
    <dt className="font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 sm:mt-0 sm:col-span-2">
      {isSelectable ? (
        <Select
          options={selectableData}
          value={selectableData.find((country) => country.value === value)}
          onChange={(selectedOption) => onChange(selectedOption.value)}
          name={`profile-${label.replace(/\s+/g, '-').toLowerCase()}`}
          inputId={`profile-${label.replace(/\s+/g, '-').toLowerCase()}`}
          classNamePrefix="profile-select"
          autoComplete="off"
        />
      ) : (
        disabled ? (
          <div className="mt-1 block w-full text-sm md:text-base text-gray-700 py-1 px-2">
            {value}
          </div>
        ) : (
          <input
            type={type}
            autoComplete={autoComplete}
            className="mt-1 border py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full text-sm md:text-base  rounded-md"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      )}
    </dd>
  </div>
);

export default ProfileDetailsPanel;
