import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input Component', () => {
  describe('Rendering Tests', () => {
    it('should render basic input with placeholder', () => {
      render(<Input placeholder="Enter text..." />);
      const input = screen.getByPlaceholderText('Enter text...');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass(
        'flex',
        'h-9',
        'w-full',
        'rounded-md',
        'border',
        'border-input',
        'bg-transparent',
        'px-3',
        'py-1'
      );
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} defaultValue="Test Value" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.value).toBe('Test Value');
    });

    it('should render with correct base styles', () => {
      render(<Input data-testid="styled-input" />);
      const input = screen.getByTestId('styled-input');
      expect(input).toHaveClass(
        'text-base',
        'shadow-sm',
        'transition-colors',
        'md:text-sm'
      );
    });
  });

  describe('Input Types Testing', () => {
    const inputTypes = ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time'];

    inputTypes.forEach(type => {
      it(`should render ${type} input type correctly`, () => {
        render(<Input type={type as any} data-testid={`${type}-input`} />);
        const input = screen.getByTestId(`${type}-input`);
        expect(input).toHaveAttribute('type', type);
      });
    });

    it('should default to text type when no type is specified', () => {
      render(<Input data-testid="default-input" />);
      const input = screen.getByTestId('default-input') as HTMLInputElement;
      // When type is not specified, it defaults to 'text' but may not have the attribute
      expect(input.type).toBe('text');
    });
  });

  describe('State Management', () => {
    it('should handle disabled state', () => {
      render(<Input disabled placeholder="Disabled input" />);
      const input = screen.getByPlaceholderText('Disabled input');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('should handle readonly state', async () => {
      const user = userEvent.setup();
      render(<Input readOnly defaultValue="Readonly text" data-testid="readonly-input" />);
      const input = screen.getByTestId('readonly-input') as HTMLInputElement;
      
      expect(input).toHaveAttribute('readonly');
      expect(input.value).toBe('Readonly text');
      
      // Try to type in readonly input
      await user.type(input, 'New text');
      expect(input.value).toBe('Readonly text'); // Value shouldn't change
    });

    it('should handle focus state', () => {
      render(<Input data-testid="focus-input" />);
      const input = screen.getByTestId('focus-input');
      
      expect(input).toHaveClass(
        'focus-visible:outline-none',
        'focus-visible:ring-1',
        'focus-visible:ring-ring'
      );
    });
  });

  describe('Event Handling', () => {
    it('should handle onChange event', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, 'Hello');
      expect(handleChange).toHaveBeenCalledTimes(5); // Once for each character
      expect(input).toHaveValue('Hello');
    });

    it('should handle onFocus event', () => {
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} />);
      const input = screen.getByRole('textbox');
      
      fireEvent.focus(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);
      expect(handleFocus).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'focus',
          target: input
        })
      );
    });

    it('should handle onBlur event', () => {
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');
      
      fireEvent.focus(input);
      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalledTimes(1);
      expect(handleBlur).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'blur',
          target: input
        })
      );
    });

    it('should handle onKeyDown event', async () => {
      const handleKeyDown = jest.fn();
      const user = userEvent.setup();
      
      render(<Input onKeyDown={handleKeyDown} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '{Enter}');
      expect(handleKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'Enter',
          code: 'Enter'
        })
      );
    });

    it('should handle form submission on Enter', async () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());
      const user = userEvent.setup();
      
      render(
        <form onSubmit={handleSubmit}>
          <Input />
          <button type="submit">Submit</button>
        </form>
      );
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Test{Enter}');
      
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('Styling and Customization', () => {
    it('should apply custom className', () => {
      render(<Input className="custom-class bg-red-500" data-testid="custom-input" />);
      const input = screen.getByTestId('custom-input');
      expect(input).toHaveClass('custom-class', 'bg-red-500');
      // Also should maintain default classes
      expect(input).toHaveClass('border', 'border-input');
    });

    it('should have placeholder styling', () => {
      render(<Input placeholder="Placeholder text" />);
      const input = screen.getByPlaceholderText('Placeholder text');
      expect(input).toHaveClass('placeholder:text-muted-foreground');
    });

    it('should have file input specific styling', () => {
      render(<Input type="file" data-testid="file-input" />);
      const input = screen.getByTestId('file-input');
      expect(input).toHaveClass(
        'file:border-0',
        'file:bg-transparent',
        'file:text-sm',
        'file:font-medium',
        'file:text-foreground'
      );
    });
  });

  describe('Value Management', () => {
    it('should handle controlled input', async () => {
      const ControlledInput = () => {
        const [value, setValue] = React.useState('Initial');
        return (
          <Input 
            value={value} 
            onChange={(e) => setValue(e.target.value)}
            data-testid="controlled-input"
          />
        );
      };

      const user = userEvent.setup();
      render(<ControlledInput />);
      const input = screen.getByTestId('controlled-input') as HTMLInputElement;
      
      expect(input.value).toBe('Initial');
      
      await user.clear(input);
      await user.type(input, 'New Value');
      expect(input.value).toBe('New Value');
    });

    it('should handle uncontrolled input with defaultValue', async () => {
      const user = userEvent.setup();
      render(<Input defaultValue="Default" data-testid="uncontrolled-input" />);
      const input = screen.getByTestId('uncontrolled-input') as HTMLInputElement;
      
      expect(input.value).toBe('Default');
      
      await user.clear(input);
      await user.type(input, 'Changed');
      expect(input.value).toBe('Changed');
    });
  });

  describe('Accessibility', () => {
    it('should support aria attributes', () => {
      render(
        <Input
          aria-label="Email address"
          aria-describedby="email-error"
          aria-invalid="true"
          aria-required="true"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Email address');
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should work with label elements', () => {
      render(
        <>
          <label htmlFor="test-input">Test Label</label>
          <Input id="test-input" />
        </>
      );
      const input = screen.getByLabelText('Test Label');
      expect(input).toBeInTheDocument();
    });

    it('should handle required attribute', () => {
      render(<Input required data-testid="required-input" />);
      const input = screen.getByTestId('required-input');
      expect(input).toBeRequired();
    });
  });

  describe('Edge Cases', () => {
    it('should handle maxLength attribute', async () => {
      const user = userEvent.setup();
      render(<Input maxLength={5} data-testid="maxlength-input" />);
      const input = screen.getByTestId('maxlength-input') as HTMLInputElement;
      
      await user.type(input, '1234567890');
      expect(input.value).toBe('12345'); // Should be limited to 5 characters
    });

    it('should handle pattern validation', () => {
      render(
        <Input
          type="tel"
          pattern="[0-9]{3}-[0-9]{3}-[0-ringify-4]"
          data-testid="pattern-input"
        />
      );
      const input = screen.getByTestId('pattern-input');
      expect(input).toHaveAttribute('pattern', '[0-9]{3}-[0-9]{3}-[0-ringify-4]');
    });

    it('should handle autocomplete attribute', () => {
      render(<Input autoComplete="email" data-testid="autocomplete-input" />);
      const input = screen.getByTestId('autocomplete-input');
      expect(input).toHaveAttribute('autocomplete', 'email');
    });

    it('should handle min and max for number inputs', () => {
      render(
        <Input
          type="number"
          min="0"
          max="100"
          data-testid="number-input"
        />
      );
      const input = screen.getByTestId('number-input');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
    });
  });
});