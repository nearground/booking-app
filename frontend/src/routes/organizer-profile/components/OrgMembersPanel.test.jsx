import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OrgMembersPanel from './OrgMembersPanel';

const baseOrganization = {
  id: 1,
  name: 'Acme Adventures',
  email: 'team@acme.test',
  LocationId: 7,
  members: [
    {
      id: 10,
      firstName: 'Sam',
      lastName: 'Guide',
      email: 'sam@acme.test',
      isAdmin: true,
      profilePicture: '',
    },
  ],
  pendingInvites: [
    {
      id: 51,
      email: 'new@acme.test',
      role: 'member',
      code: 'ABC123',
      inviteUrl: 'https://example.test/invite',
      expiresAt: '2099-01-10T12:00:00.000Z',
    },
  ],
};

const renderPanel = (overrides = {}) => {
  const props = {
    organizations: [baseOrganization],
    organization: baseOrganization,
    selectedOrganizationId: '1',
    onSelectOrganization: vi.fn(),
    isAdmin: true,
    locations: [{ id: 7, name: 'Marina HQ', city: 'Puerto Vallarta', country: 'MX' }],
    orgEdit: { name: 'Acme Adventures', email: 'team@acme.test', locationId: '7' },
    onOrgFieldChange: vi.fn(),
    onSaveOrganization: vi.fn(),
    inviteForm: { email: '', role: 'member', expiresInDays: 7 },
    onInviteFieldChange: vi.fn(),
    onCreateInvite: vi.fn(),
    onResendInvite: vi.fn(),
    onCancelInvite: vi.fn(),
    onCopyInviteValue: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<OrgMembersPanel {...props} />),
    props,
  };
};

describe('OrgMembersPanel', () => {
  test('renders organization details, members, and pending invites', () => {
    renderPanel();

    expect(screen.getByText('Acme Adventures')).toBeInTheDocument();
    expect(screen.getByText('Members (1)')).toBeInTheDocument();
    expect(screen.getByText('Sam Guide')).toBeInTheDocument();
    expect(screen.getByText('new@acme.test')).toBeInTheDocument();
    expect(screen.getByText('Pending Invites (1)')).toBeInTheDocument();
  });

  test('fires invite callbacks from the invite management actions', () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resend' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Invite' }));

    expect(props.onCreateInvite).toHaveBeenCalledTimes(1);
    expect(props.onResendInvite).toHaveBeenCalledWith(51);
    expect(props.onCancelInvite).toHaveBeenCalledWith(51);
  });

  test('shows a clear empty state when no members or invites exist', () => {
    renderPanel({
      organization: { ...baseOrganization, members: [], pendingInvites: [] },
      organizations: [{ ...baseOrganization, members: [], pendingInvites: [] }],
    });

    expect(screen.getByText('No members have been assigned yet.')).toBeInTheDocument();
    expect(screen.getByText('No pending invites. Send one to grow your organization.')).toBeInTheDocument();
  });
});