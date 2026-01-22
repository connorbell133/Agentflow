import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminTabs } from '../AdminTabs';

// Mock the icon imports
jest.mock(
  '@/assets/admin/tabs/model.svg',
  () =>
    function ModelIcon(props: any) {
      return <svg data-testid="model-icon" {...props} />;
    }
);

jest.mock(
  '@/assets/admin/tabs/overview.svg',
  () =>
    function OverviewIcon(props: any) {
      return <svg data-testid="overview-icon" {...props} />;
    }
);

jest.mock(
  '@/assets/admin/tabs/user-alt-1-svgrepo-com.svg',
  () =>
    function UserIcon(props: any) {
      return <svg data-testid="user-icon" {...props} />;
    }
);

jest.mock(
  '@/assets/admin/tabs/group-team-svgrepo-com.svg',
  () =>
    function GroupIcon(props: any) {
      return <svg data-testid="group-icon" {...props} />;
    }
);

jest.mock(
  '@/assets/admin/tabs/convo.svg',
  () =>
    function ConversationIcon(props: any) {
      return <svg data-testid="conversation-icon" {...props} />;
    }
);

// Mock the TabbedMenu component with proper behavior
jest.mock('@/components/shared/menus/TabbedMenu', () => ({
  Tabs: ({ tabs, setPage }: { tabs: any[]; setPage: (page: string) => void }) => {
    return (
      <div data-testid="tabs-container">
        {tabs.map((tab: any, index: number) => (
          <button
            key={index}
            data-testid={`tab-${tab.label.toLowerCase()}`}
            data-active={tab.active}
            onClick={() => setPage(tab.label.toLowerCase())}
            className={tab.active ? 'active' : ''}
          >
            <tab.icon data-testid={`icon-${tab.label.toLowerCase()}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    );
  },
}));

describe('AdminTabs Component', () => {
  describe('Rendering', () => {
    it('should render all tabs with correct labels', () => {
      render(<AdminTabs />);

      expect(screen.getByTestId('tabs-container')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Models')).toBeInTheDocument();
      expect(screen.getByText('Groups')).toBeInTheDocument();
      expect(screen.getByText('Conversations')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render with correct icons for each tab', () => {
      render(<AdminTabs />);

      expect(screen.getByTestId('icon-overview')).toBeInTheDocument();
      expect(screen.getByTestId('icon-users')).toBeInTheDocument();
      expect(screen.getByTestId('icon-models')).toBeInTheDocument();
      expect(screen.getByTestId('icon-groups')).toBeInTheDocument();
      expect(screen.getByTestId('icon-conversations')).toBeInTheDocument();
      expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
    });

    it('should have default active tab as overview', () => {
      render(<AdminTabs />);

      const overviewTab = screen.getByTestId('tab-overview');
      expect(overviewTab).toHaveAttribute('data-active', 'true');

      // Check other tabs are not active
      expect(screen.getByTestId('tab-users')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('tab-models')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('tab-groups')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('tab-conversations')).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId('tab-settings')).toHaveAttribute('data-active', 'false');
    });
  });

  describe('Active Tab Control', () => {
    it('should set active tab based on activeTab prop', () => {
      render(<AdminTabs activeTab="users" />);

      expect(screen.getByTestId('tab-users')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('tab-overview')).toHaveAttribute('data-active', 'false');
    });

    it('should handle all valid activeTab values', () => {
      const tabs = ['overview', 'users', 'models', 'groups', 'conversations', 'settings'];

      tabs.forEach(tab => {
        const { unmount } = render(<AdminTabs activeTab={tab} />);

        const activeTab = screen.getByTestId(`tab-${tab}`);
        expect(activeTab).toHaveAttribute('data-active', 'true');

        // Check all other tabs are not active
        tabs
          .filter(t => t !== tab)
          .forEach(otherTab => {
            expect(screen.getByTestId(`tab-${otherTab}`)).toHaveAttribute('data-active', 'false');
          });

        unmount();
      });
    });

    it('should update active tab when prop changes', () => {
      const { rerender } = render(<AdminTabs activeTab="overview" />);

      expect(screen.getByTestId('tab-overview')).toHaveAttribute('data-active', 'true');

      rerender(<AdminTabs activeTab="models" />);

      expect(screen.getByTestId('tab-models')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('tab-overview')).toHaveAttribute('data-active', 'false');
    });
  });

  describe('Tab Change Callback', () => {
    it('should call onTabChange when a tab is clicked', async () => {
      const handleTabChange = jest.fn();
      const user = userEvent.setup();

      render(<AdminTabs onTabChange={handleTabChange} />);

      await user.click(screen.getByTestId('tab-users'));

      expect(handleTabChange).toHaveBeenCalledTimes(1);
      expect(handleTabChange).toHaveBeenCalledWith('users');
    });

    it('should call onTabChange for each tab click', async () => {
      const handleTabChange = jest.fn();
      const user = userEvent.setup();

      render(<AdminTabs onTabChange={handleTabChange} />);

      const tabs = ['overview', 'users', 'models', 'groups', 'conversations', 'settings'];

      for (const tab of tabs) {
        await user.click(screen.getByTestId(`tab-${tab}`));
      }

      expect(handleTabChange).toHaveBeenCalledTimes(6);
      tabs.forEach((tab, index) => {
        expect(handleTabChange).toHaveBeenNthCalledWith(index + 1, tab);
      });
    });

    it('should not error when onTabChange is not provided', async () => {
      const user = userEvent.setup();

      render(<AdminTabs />);

      // Should not throw error
      await expect(user.click(screen.getByTestId('tab-users'))).resolves.not.toThrow();
    });
  });

  describe('Tab Configuration', () => {
    it('should pass correct tab configuration to Tabs component', () => {
      render(<AdminTabs activeTab="models" />);

      // Verify that the tabs are in the correct order
      const tabButtons = screen.getAllByRole('button');
      expect(tabButtons).toHaveLength(6);

      const expectedOrder = ['Overview', 'Users', 'Models', 'Groups', 'Conversations', 'Settings'];
      tabButtons.forEach((button, index) => {
        expect(button).toHaveTextContent(expectedOrder[index]);
      });
    });

    it('should use correct icons for each tab', () => {
      render(<AdminTabs />);

      // Verify icon usage by checking if the icon components are rendered
      // They are rendered inside the tabs with data-testid="icon-{tabname}"
      expect(screen.getByTestId('icon-overview')).toBeInTheDocument();
      expect(screen.getByTestId('icon-users')).toBeInTheDocument();
      expect(screen.getByTestId('icon-models')).toBeInTheDocument();
      expect(screen.getByTestId('icon-groups')).toBeInTheDocument();
      expect(screen.getByTestId('icon-conversations')).toBeInTheDocument();
      expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
    });
  });

  describe('Integration with Tabs Component', () => {
    it('should pass setPage callback to all tabs', async () => {
      const handleTabChange = jest.fn();
      const user = userEvent.setup();

      render(<AdminTabs onTabChange={handleTabChange} />);

      // Click on different tabs and verify callback is invoked
      await user.click(screen.getByTestId('tab-users'));
      expect(handleTabChange).toHaveBeenCalledWith('users');

      await user.click(screen.getByTestId('tab-models'));
      expect(handleTabChange).toHaveBeenCalledWith('models');
    });

    it('should handle rapid tab switching', async () => {
      const handleTabChange = jest.fn();
      const user = userEvent.setup();

      render(<AdminTabs onTabChange={handleTabChange} />);

      // Rapid clicks on different tabs
      await user.click(screen.getByTestId('tab-users'));
      await user.click(screen.getByTestId('tab-models'));
      await user.click(screen.getByTestId('tab-groups'));

      expect(handleTabChange).toHaveBeenCalledTimes(3);
      expect(handleTabChange).toHaveBeenCalledWith('users');
      expect(handleTabChange).toHaveBeenCalledWith('models');
      expect(handleTabChange).toHaveBeenCalledWith('groups');
    });
  });

  describe('Edge Cases', () => {
    it('should handle clicking on already active tab', async () => {
      const handleTabChange = jest.fn();
      const user = userEvent.setup();

      render(<AdminTabs activeTab="users" onTabChange={handleTabChange} />);

      // Click on the already active tab
      await user.click(screen.getByTestId('tab-users'));

      // Should still call the callback
      expect(handleTabChange).toHaveBeenCalledWith('users');
    });

    it('should handle undefined activeTab prop gracefully', () => {
      render(<AdminTabs activeTab={undefined} />);

      // Should default to overview
      expect(screen.getByTestId('tab-overview')).toHaveAttribute('data-active', 'true');
    });

    it('should maintain tab structure when rerendering', () => {
      const { rerender } = render(<AdminTabs activeTab="overview" />);

      const initialTabs = screen.getAllByRole('button').map(btn => btn.textContent);

      rerender(<AdminTabs activeTab="users" />);

      const rerenderTabs = screen.getAllByRole('button').map(btn => btn.textContent);

      expect(initialTabs).toEqual(rerenderTabs);
    });
  });
});
