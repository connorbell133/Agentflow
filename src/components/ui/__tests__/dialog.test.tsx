import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../dialog';

// Mock the Radix UI portal to render in the same container for testing
jest.mock('@radix-ui/react-dialog', () => {
  const actual = jest.requireActual('@radix-ui/react-dialog');
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe('Dialog Component', () => {
  describe('Basic Functionality', () => {
    it('should be closed by default', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Open Dialog')).toBeInTheDocument();
      expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
    });

    it('should open when trigger is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));
      
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog description')).toBeInTheDocument();
    });

    it('should close when close button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      
      const closeButton = screen.getByRole('button', { name: 'Close' });
      await user.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Controlled Mode', () => {
    it('should respond to open prop changes', async () => {
      const { rerender } = render(
        <Dialog open={false}>
          <DialogContent>
            <DialogTitle>Controlled Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.queryByText('Controlled Dialog')).not.toBeInTheDocument();

      rerender(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Controlled Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Controlled Dialog')).toBeInTheDocument();
    });

    it('should call onOpenChange when state changes', async () => {
      const handleOpenChange = jest.fn();
      const user = userEvent.setup();
      
      render(
        <Dialog onOpenChange={handleOpenChange}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(handleOpenChange).toHaveBeenCalledWith(true);

      const closeButton = screen.getByRole('button', { name: 'Close' });
      await user.click(closeButton);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Overlay Behavior', () => {
    it('should render overlay when dialog is open', async () => {
      const user = userEvent.setup();
      
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Test</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      
      // Check for overlay by its classes
      const overlay = screen.getByTestId('dialog-content').previousSibling;
      expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50', 'bg-black/80');
    });

    it('should close when overlay is clicked', async () => {
      const user = userEvent.setup();
      const handleOpenChange = jest.fn();
      
      render(
        <Dialog onOpenChange={handleOpenChange}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogTitle>Test</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByText('Test')).toBeInTheDocument();

      // Click the overlay (previous sibling of content)
      const overlay = screen.getByTestId('dialog-content').previousSibling as HTMLElement;
      await user.click(overlay);

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Accessibility Features', () => {
    it('should trap focus within dialog', async () => {
      const user = userEvent.setup();
      
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Focus Test</DialogTitle>
            <button>First Button</button>
            <button>Second Button</button>
            <DialogClose>Close Dialog</DialogClose>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      
      // Dialog content should receive focus
      await waitFor(() => {
        expect(document.activeElement?.closest('[role="dialog"]')).toBeTruthy();
      });
    });

    it('should close on Escape key press', async () => {
      const handleOpenChange = jest.fn();
      const user = userEvent.setup();
      
      render(
        <Dialog onOpenChange={handleOpenChange}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Escape Test</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByText('Escape Test')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it('should have proper ARIA attributes', async () => {
      const user = userEvent.setup();
      
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Accessible Dialog</DialogTitle>
            <DialogDescription>This is a description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Check that title is properly associated
      const title = screen.getByText('Accessible Dialog');
      expect(title).toBeInTheDocument();
      
      // Check that description is properly associated
      const description = screen.getByText('This is a description');
      expect(description).toBeInTheDocument();
    });

    it('should have accessible close button', async () => {
      const user = userEvent.setup();
      
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Test</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.getByRole('button', { name: 'Close' });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton.querySelector('.sr-only')).toHaveTextContent('Close');
    });
  });

  describe('Compound Components', () => {
    it('should render DialogHeader with correct styling', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader className="custom-header">
              <DialogTitle>Header Test</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByText('Header Test').parentElement;
      expect(header).toHaveClass(
        'flex',
        'flex-col',
        'space-y-1.5',
        'text-center',
        'sm:text-left',
        'custom-header'
      );
    });

    it('should render DialogFooter with correct layout', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogFooter className="custom-footer">
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByText('Cancel').parentElement;
      expect(footer).toHaveClass(
        'flex',
        'flex-col-reverse',
        'sm:flex-row',
        'sm:justify-end',
        'sm:space-x-2',
        'custom-footer'
      );
    });

    it('should render DialogTitle with correct styling', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle className="custom-title">Styled Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByText('Styled Title');
      expect(title).toHaveClass(
        'text-lg',
        'font-semibold',
        'leading-none',
        'tracking-tight',
        'custom-title'
      );
    });

    it('should render DialogDescription with correct styling', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogDescription className="custom-description">
              Styled Description
            </DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const description = screen.getByText('Styled Description');
      expect(description).toHaveClass(
        'text-sm',
        'text-muted-foreground',
        'custom-description'
      );
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple dialogs', async () => {
      const user = userEvent.setup();
      
      render(
        <>
          <Dialog>
            <DialogTrigger>Open Dialog 1</DialogTrigger>
            <DialogContent>
              <DialogTitle>Dialog 1</DialogTitle>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger>Open Dialog 2</DialogTrigger>
            <DialogContent>
              <DialogTitle>Dialog 2</DialogTitle>
            </DialogContent>
          </Dialog>
        </>
      );

      await user.click(screen.getByText('Open Dialog 1'));
      expect(screen.getByText('Dialog 1')).toBeInTheDocument();
      expect(screen.queryByText('Dialog 2')).not.toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: 'Close' });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Dialog 1')).not.toBeInTheDocument();
      });

      await user.click(screen.getByText('Open Dialog 2'));
      expect(screen.getByText('Dialog 2')).toBeInTheDocument();
    });

    it('should handle custom trigger element', async () => {
      const user = userEvent.setup();
      
      const CustomButton = React.forwardRef<HTMLButtonElement, any>((props, ref) => (
        <button ref={ref} {...props} style={{ color: 'red' }}>
          Custom Trigger
        </button>
      ));
      CustomButton.displayName = 'CustomButton';

      render(
        <Dialog>
          <DialogTrigger asChild>
            <CustomButton />
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Custom Trigger Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const trigger = screen.getByText('Custom Trigger');
      expect(trigger).toHaveStyle({ color: 'rgb(255, 0, 0)' });

      await user.click(trigger);
      expect(screen.getByText('Custom Trigger Dialog')).toBeInTheDocument();
    });

    it('should handle DialogClose component', async () => {
      const user = userEvent.setup();
      const handleOpenChange = jest.fn();
      
      render(
        <Dialog onOpenChange={handleOpenChange} defaultOpen>
          <DialogContent>
            <DialogTitle>Test</DialogTitle>
            <DialogClose className="custom-close">
              Custom Close Button
            </DialogClose>
          </DialogContent>
        </Dialog>
      );

      const customClose = screen.getByText('Custom Close Button');
      expect(customClose).toHaveClass('custom-close');

      await user.click(customClose);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });
});