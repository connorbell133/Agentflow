import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserTable from '../UserTable';
import { useInvites } from '@/hooks/organization/use-invites';
import { useOrgs } from '@/hooks/organization/use-organizations';
import { updateUserProfile } from '@/actions/auth/users';

jest.mock('@/hooks/organization/use-invites');
jest.mock('@/hooks/organization/use-organizations');
jest.mock('@/actions/auth/users');
jest.mock('@/components/shared/loading/SkeletonLoader', () => ({
  UserTableSkeleton: () => <div data-testid="skeleton-loader">Loading...</div>,
}));
jest.mock('../EditUserModal', () => ({
  __esModule: true,
  default: ({ user, open, onClose, onSaveProfile }: any) =>
    open ? (
      <div data-testid="edit-modal">
        <div>Edit User Modal</div>
        <button onClick={() => onSaveProfile(user.id, { fullName: 'Updated Name' })}>Save</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: any) => <img {...props} />,
}));

const mockUser = {
  id: 'user-1',
  email: 'user1@example.com',
  fullName: 'John Doe',
  name: 'John Doe',
  role: 'user',
  organization: 'org-123',
  phoneNumber: '1234567890',
  username: 'johndoe',
  tags: [],
  properties: {},
  superAdmin: false,
  publicUserId: 'pub-user-1',
  avatarUrl: 'https://example.com/avatar.jpg',
  created_at: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockUsers = [
  mockUser,
  {
    ...mockUser,
    id: 'user-2',
    email: 'user2@example.com',
    fullName: 'Jane Smith',
    username: 'janesmith',
    avatarUrl: null,
  },
  {
    ...mockUser,
    id: 'user-3',
    email: 'user3@example.com',
    fullName: null,
    username: 'user3',
    avatarUrl: null,
  },
];

const mockOrg = {
  id: 'org-123',
  name: 'Test Organization',
  owner: 'owner-id',
  created_at: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockGroups = [
  { id: 'group-1', role: 'admin', organization: 'org-123' },
  { id: 'group-2', role: 'editor', organization: 'org-123' },
  { id: 'group-3', role: 'viewer', organization: 'org-123' },
];

const mockUserGroups = [
  { id: '1', userId: 'user-1', groupId: 'group-1', organization: 'org-123' },
  { id: '2', userId: 'user-1', groupId: 'group-2', organization: 'org-123' },
  { id: '3', userId: 'user-2', groupId: 'group-3', organization: 'org-123' },
];

const mockInvites = [
  {
    id: 'invite-1',
    invitee: 'pending1@example.com',
    inviter: 'owner-id',
    group: 'group-1',
    organization: 'org-123',
    created_at: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'invite-2',
    invitee: 'pending2@example.com',
    inviter: 'owner-id',
    group: 'group-2',
    organization: 'org-123',
    created_at: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

const mockInviteHooks = {
  fetchOrgInvites: jest.fn(),
  sendInvite: jest.fn().mockResolvedValue({}),
  deleteInvite: jest.fn().mockResolvedValue({}),
};

const mockOrgHooks = {
  removeUserFromOrg: jest.fn().mockResolvedValue({}),
};

const defaultProps = {
  users: mockUsers,
  active_user: mockUser,
  groups: mockGroups,
  org: mockOrg,
  userGroups: mockUserGroups,
  updateUserGroup: jest.fn(),
  getUserStatus: jest.fn(user => {
    if (user.id === 'user-1') return 'active';
    if (user.id === 'user-2') return 'inactive';
    return 'not_started';
  }),
};

describe('UserTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    // Make fetchOrgInvites resolve synchronously for the initial load
    mockInviteHooks.fetchOrgInvites.mockImplementation(() =>
      Promise.resolve({ invites: mockInvites })
    );
    (useInvites as jest.Mock).mockReturnValue(mockInviteHooks);
    (useOrgs as jest.Mock).mockReturnValue(mockOrgHooks);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Loading State', () => {
    it('should show skeleton loader while loading invites', () => {
      const { getByTestId } = render(<UserTable {...defaultProps} />);
      expect(getByTestId('skeleton-loader')).toBeInTheDocument();
    });
  });

  describe('User Table Display', () => {
    it('should render user table after loading', async () => {
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Full name')).toBeInTheDocument();
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();

      // For user without fullName, check in the name column
      const nameColumns = screen.getAllByText('user3@example.com');
      expect(nameColumns.length).toBeGreaterThan(0);
    });

    it('should display user avatars and fallback to default', async () => {
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Full name')).toBeInTheDocument();
      });

      const avatars = screen.getAllByRole('img');
      expect(avatars[0]).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      // Next/Image renders an object for static imports, just check it exists
      expect(avatars[1]).toHaveAttribute('src');
    });

    it('should display user status with correct styling', async () => {
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        const activeRow = screen.getByText('John Doe').closest('tr');
        const activeStatus = within(activeRow!).getByText('active');
        expect(activeStatus).toBeInTheDocument();

        const statusDot = activeStatus.previousSibling;
        expect(statusDot).toHaveClass('bg-green-500');
      });
    });

    it('should display user groups with badges', async () => {
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        const userRow = screen.getByText('John Doe').closest('tr');
        expect(within(userRow!).getByText('admin')).toBeInTheDocument();
        expect(within(userRow!).getByText('editor')).toBeInTheDocument();
      });
    });

    it('should truncate groups when more than 3', async () => {
      const manyGroups = [
        ...mockUserGroups,
        { id: '4', userId: 'user-1', groupId: 'group-3', organization: 'org-123' },
        { id: '5', userId: 'user-1', groupId: 'group-1', organization: 'org-123' },
      ];

      render(<UserTable {...defaultProps} userGroups={manyGroups} />);

      await waitFor(() => {
        const userRow = screen.getByText('John Doe').closest('tr');
        expect(within(userRow!).getByText('+1')).toBeInTheDocument();
      });
    });
  });

  describe('User Actions', () => {
    it('should open edit modal when edit button is clicked', async () => {
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        const editButtons = screen.getAllByTitle('Edit');
        fireEvent.click(editButtons[0]);
      });

      expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
      expect(screen.getByText('Edit User Modal')).toBeInTheDocument();
    });

    it('should close edit modal when close button is clicked', async () => {
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        const editButtons = screen.getAllByTitle('Edit');
        fireEvent.click(editButtons[0]);
      });

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument();
      });
    });

    it('should handle user removal', async () => {
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        const removeButtons = screen.getAllByTitle('Remove');
        fireEvent.click(removeButtons[0]);
      });

      expect(mockOrgHooks.removeUserFromOrg).toHaveBeenCalledWith('user-1', 'org-123');
    });

    it('should update profile when save is clicked in edit modal', async () => {
      (updateUserProfile as jest.Mock).mockResolvedValue({});

      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        const editButtons = screen.getAllByTitle('Edit');
        fireEvent.click(editButtons[0]);
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUserProfile).toHaveBeenCalledWith('user-1', { fullName: 'Updated Name' });
      });
    });
  });

  describe('Invite User Form', () => {
    it('should render invite form with email and group inputs', async () => {
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter user's email")).toBeInTheDocument();
        expect(screen.getByText('Select a group')).toBeInTheDocument();
        expect(screen.getByText('Invite')).toBeInTheDocument();
      });
    });

    it('should send invite with correct data', async () => {
      const user = userEvent.setup();
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Invite')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("Enter user's email");
      const groupSelect = screen.getByText('Select a group').parentElement as HTMLSelectElement;

      await user.type(emailInput, 'newuser@example.com');
      await user.selectOptions(groupSelect, 'group-1');
      await user.click(screen.getByText('Invite'));

      await waitFor(() => {
        expect(mockInviteHooks.sendInvite).toHaveBeenCalledWith(
          'newuser@example.com',
          'org-123',
          'group-1',
          'owner-id'
        );
      });
    });

    it('should clear form after successful invite', async () => {
      const user = userEvent.setup();
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Invite')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("Enter user's email") as HTMLInputElement;
      const groupSelect = screen.getByText('Select a group').parentElement as HTMLSelectElement;

      await user.type(emailInput, 'newuser@example.com');
      await user.selectOptions(groupSelect, 'group-1');
      await user.click(screen.getByText('Invite'));

      await waitFor(() => {
        expect(emailInput.value).toBe('');
        expect(groupSelect.value).toBe('');
      });
    });

    it('should disable inputs while inviting', async () => {
      const user = userEvent.setup();
      mockInviteHooks.sendInvite.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Invite')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText("Enter user's email");
      const groupSelect = screen.getByText('Select a group').parentElement as HTMLSelectElement;

      await user.type(emailInput, 'newuser@example.com');
      await user.selectOptions(groupSelect, 'group-1');
      await user.click(screen.getByText('Invite'));

      expect(emailInput).toBeDisabled();
      expect(groupSelect).toBeDisabled();
      expect(screen.getByText('Inviting...')).toBeInTheDocument();
    });
  });

  describe('Pending Invites', () => {
    it('should display pending invites table', async () => {
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Pending Invites')).toBeInTheDocument();
        expect(screen.getByText('pending1@example.com')).toBeInTheDocument();
        expect(screen.getByText('pending2@example.com')).toBeInTheDocument();
      });
    });

    it('should handle invite deletion', async () => {
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      expect(mockInviteHooks.deleteInvite).toHaveBeenCalledWith(mockInvites[0]);
    });

    it('should show loading state while deleting invite', async () => {
      mockInviteHooks.deleteInvite.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should not render invites section when no invites exist', async () => {
      mockInviteHooks.fetchOrgInvites.mockResolvedValue({ invites: [] });

      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Pending Invites')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Status Function', () => {
    it('should use getUserStatus function when provided', async () => {
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('inactive')).toBeInTheDocument();
        expect(screen.getByText('not started')).toBeInTheDocument();
      });

      expect(defaultProps.getUserStatus).toHaveBeenCalledTimes(mockUsers.length);
    });

    it('should default to not_started when getUserStatus is not provided', async () => {
      const propsWithoutGetStatus = { ...defaultProps, getUserStatus: undefined };
      render(<UserTable {...propsWithoutGetStatus} />);

      await waitFor(() => {
        const statuses = screen.getAllByText('not started');
        expect(statuses).toHaveLength(mockUsers.length);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty users array', async () => {
      render(<UserTable {...defaultProps} users={[]} />);

      await waitFor(() => {
        expect(screen.getByText('Full name')).toBeInTheDocument();
      });

      // Find the main table (not pending invites table)
      const tables = screen.getAllByRole('table');
      const mainTable = tables[0]; // First table is the user table
      const tableBody = mainTable.querySelector('tbody');
      expect(tableBody?.children).toHaveLength(0);
    });

    it('should handle empty groups array', async () => {
      render(<UserTable {...defaultProps} groups={[]} />);

      await waitFor(() => {
        const groupSelect = screen.getByText('Select a group').parentElement as HTMLSelectElement;
        expect(groupSelect.options).toHaveLength(1); // Only default option
      });
    });

    it('should handle null/undefined userGroups', async () => {
      render(<UserTable {...defaultProps} userGroups={undefined as any} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        // Should not crash and no groups should be displayed
      });
    });
  });

  describe('Component State Management', () => {
    it('should refresh invites after sending new invite', async () => {
      const user = userEvent.setup();
      render(<UserTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Full name')).toBeInTheDocument();
      });

      // Reset the mock to count only new calls
      mockInviteHooks.fetchOrgInvites.mockClear();

      const emailInput = screen.getByPlaceholderText("Enter user's email");
      const groupSelect = screen.getByText('Select a group').parentElement as HTMLSelectElement;

      await user.type(emailInput, 'newuser@example.com');
      await user.selectOptions(groupSelect, 'group-1');
      await user.click(screen.getByText('Invite'));

      await waitFor(() => {
        expect(mockInviteHooks.fetchOrgInvites).toHaveBeenCalled();
      });
    });

    it('should refresh invites after deleting invite', async () => {
      // Setup: render component and wait for initial load
      render(<UserTable {...defaultProps} />);

      // Wait for initial render to complete and invites to show
      await waitFor(() => {
        expect(screen.getByText('Full name')).toBeInTheDocument();
      });

      // Since useState runs synchronously, check that invites were fetched
      expect(mockInviteHooks.fetchOrgInvites).toHaveBeenCalledWith('org-123');

      // Check that we have the pending invites section
      const pendingInvitesHeader = screen.getByText('Pending Invites');
      expect(pendingInvitesHeader).toBeInTheDocument();

      // Reset mock count
      mockInviteHooks.fetchOrgInvites.mockClear();

      // Find and click delete button
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // Verify delete was called and refresh happened
      await waitFor(() => {
        expect(mockInviteHooks.deleteInvite).toHaveBeenCalledWith(mockInvites[0]);
        expect(mockInviteHooks.fetchOrgInvites).toHaveBeenCalledWith('org-123');
      });
    });
  });
});
