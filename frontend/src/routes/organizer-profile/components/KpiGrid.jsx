const KpiGrid = ({ upcomingSessionsCount, openSpotsCount, pendingInvitesCount, newCommentsCount }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
      <div className="bg-white rounded shadow-md p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming Sessions (7d)</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{upcomingSessionsCount}</p>
      </div>
      <div className="bg-white rounded shadow-md p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Open Spots (7d)</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{openSpotsCount}</p>
      </div>
      <div className="bg-white rounded shadow-md p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Pending Invites</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{pendingInvitesCount}</p>
      </div>
      <div className="bg-white rounded shadow-md p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">New Comments (7d)</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{newCommentsCount}</p>
      </div>
    </div>
  );
};

export default KpiGrid;
