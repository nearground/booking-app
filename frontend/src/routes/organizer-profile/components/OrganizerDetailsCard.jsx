const OrganizerDetailsCard = ({
  pendingProfilePicturePreviewUrl,
  profilePicture,
  pendingProfilePictureFile,
  onSelectProfilePicture,
  description,
  onDescriptionChange,
  onSave,
}) => {
  return (
    <div className="bg-white rounded shadow-md p-4 md:p-6 mb-6">
      <h3 className="text-lg font-semibold text-slate-700 mb-3">Your Organizer Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          className="border rounded px-3 py-2"
          type="file"
          accept="image/*"
          onChange={(event) => onSelectProfilePicture(event.target.files?.[0])}
        />
        <div className="text-sm text-slate-600 flex items-center">
          {pendingProfilePictureFile
            ? 'New profile image selected.'
            : profilePicture
              ? 'Current profile image set.'
              : 'No profile image set yet.'}
        </div>
        {(pendingProfilePicturePreviewUrl || profilePicture) && (
          <div className="md:col-span-2">
            <img
              src={pendingProfilePicturePreviewUrl || profilePicture}
              alt="Organizer profile preview"
              className="w-full max-w-sm h-44 object-cover rounded border border-slate-200"
            />
          </div>
        )}
        <textarea
          className="border rounded px-3 py-2 md:col-span-2 min-h-28"
          placeholder="Organizer profile text"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
      </div>
      <button
        type="button"
        className="mt-3 px-4 py-2 rounded bg-brand text-white"
        onClick={onSave}
      >
        Save Organizer Profile
      </button>
    </div>
  );
};

export default OrganizerDetailsCard;
