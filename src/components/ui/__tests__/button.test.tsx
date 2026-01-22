import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('Button Component', () => {
  describe('Rendering Tests', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-primary', 'h-9', 'px-4', 'py-2');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.textContent).toBe('Button');
    });

    it('should render as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: 'Link Button' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
      expect(link).toHaveClass('bg-primary');
    });
  });

  describe('Variant Testing', () => {
    it('should render default variant correctly', () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground', 'shadow', 'hover:bg-primary/90');
    });

    it('should render destructive variant correctly', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground', 'shadow-sm', 'hover:bg-destructive/90');
    });

    it('should render outline variant correctly', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-input', 'bg-background', 'shadow-sm');
    });

    it('should render secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground', 'shadow-sm', 'hover:bg-secondary/80');
    });

    it('should render ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground');
      expect(button).not.toHaveClass('bg-primary');
    });

    it('should render link variant correctly', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-primary', 'underline-offset-4', 'hover:underline');
      expect(button).not.toHaveClass('bg-primary');
    });
  });

  describe('Size Testing', () => {
    it('should render default size correctly', () => {
      render(<Button size="default">Default Size</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'px-4', 'py-2');
    });

    it('should render small size correctly', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8', 'rounded-md', 'px-3', 'text-xs');
    });

    it('should render large size correctly', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'rounded-md', 'px-8');
    });

    it('should render icon size correctly', () => {
      render(<Button size="icon" aria-label="Settings">⚙️</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'w-9');
      expect(button).not.toHaveClass('px-4'); // Icon size doesn't have horizontal padding
    });
  });

  describe('Props and Events', () => {
    it('should handle onClick event', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');
      
      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle disabled state', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
      
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should merge custom className with variant classes', () => {
      render(
        <Button className="custom-class ml-4" variant="outline">
          Custom Class
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class', 'ml-4', 'border', 'border-input');
    });

    it('should pass through HTML button attributes', () => {
      render(
        <Button type="submit" name="submitBtn" value="submit">
          Submit
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('name', 'submitBtn');
      expect(button).toHaveAttribute('value', 'submit');
    });
  });

  describe('Accessibility', () => {
    it('should support ARIA attributes', () => {
      render(
        <Button
          aria-label="Save document"
          aria-pressed="true"
          aria-describedby="save-description"
        >
          Save
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Save document');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveAttribute('aria-describedby', 'save-description');
    });

    it('should handle keyboard navigation with Enter key', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Press Enter</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard navigation with Space key', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Press Space</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have focus-visible styles', () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-1', 'focus-visible:ring-ring');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle variant and size combination', () => {
      render(
        <Button variant="destructive" size="lg">
          Large Delete
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive', 'h-10', 'px-8');
    });

    it('should handle asChild with custom props', () => {
      const CustomLink = React.forwardRef<HTMLAnchorElement, any>((props, ref) => (
        <a ref={ref} {...props} data-custom="true" />
      ));
      CustomLink.displayName = 'CustomLink';

      render(
        <Button asChild variant="ghost" size="sm">
          <CustomLink href="/custom">Custom Link</CustomLink>
        </Button>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/custom');
      expect(link).toHaveAttribute('data-custom', 'true');
      expect(link).toHaveClass('hover:bg-accent', 'h-8', 'px-3');
    });

    it('should handle SVG icon styling', () => {
      render(
        <Button>
          <svg data-testid="icon" />
          Icon Button
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('[&_svg]:pointer-events-none', '[&_svg]:size-4', '[&_svg]:shrink-0');
    });
  });
});