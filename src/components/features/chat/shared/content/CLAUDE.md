# Chat Content Components

Content rendering and display components for various message formats.

## Component Structure
- MarkdownContent/ - Markdown parsing and rendering with security
- HtmlContent/ - Safe HTML rendering with sanitization
- LinkPreview/ - URL preview cards with metadata

## Rendering Pipeline
1. Content type detection based on message format
2. Security sanitization before rendering
3. Enhancement with interactive features
4. Performance optimization with memoization

## Component Details

### MarkdownContent
- Uses react-markdown with remark-gfm for GitHub-flavored markdown
- Custom renderers for code blocks with syntax highlighting
- Table support with responsive scrolling
- Task list rendering with checkboxes
- Image lazy loading with placeholders

### HtmlContent
- DOMPurify sanitization to prevent XSS attacks
- Whitelist of allowed tags and attributes
- Style attribute filtering
- Link target="_blank" with rel="noopener"
- Embedded content restrictions

### LinkPreview
- Metadata extraction from URLs
- OpenGraph and Twitter card support
- Fallback to basic title/description
- Image thumbnail generation
- Click handling for navigation

## Security Implementation
```typescript
// DOMPurify configuration
const purifyConfig = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'img'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  ALLOW_DATA_ATTR: false,
  FORBID_SCRIPTS: true,
  FORBID_IFRAME: true
};

// Sanitize before rendering
const sanitizedHtml = DOMPurify.sanitize(content, purifyConfig);
```

## Markdown Configuration
```typescript
// Remark plugins
const remarkPlugins = [
  remarkGfm,           // Tables, strikethrough, task lists
  remarkBreaks,        // Line breaks
  remarkEmoji,         // :emoji: support
];

// Custom components
const components = {
  code: CodeBlock,     // Syntax highlighting
  a: SafeLink,         // External link handling
  img: LazyImage,      // Lazy loaded images
};
```

## Performance Patterns
- Content memoization based on message ID
- Virtual rendering for long content
- Debounced preview generation
- Image optimization with next/image
- Code splitting for syntax highlighters

## Styling Considerations
- Consistent typography from Tailwind prose
- Dark mode support with CSS variables
- Mobile-responsive tables
- Print-friendly styles
- Accessibility compliance

## Common Patterns
```typescript
// Content type detection
const getContentRenderer = (message: Message) => {
  switch (message.format) {
    case 'markdown':
      return <MarkdownContent content={message.content} />;
    case 'html':
      return <HtmlContent content={message.content} />;
    default:
      return <PlainTextContent content={message.content} />;
  }
};

// Safe link handling
const SafeLink: React.FC<LinkProps> = ({ href, children, ...props }) => {
  const isExternal = href?.startsWith('http');
  
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </a>
  );
};
```

## Testing
```bash
# Run content component tests
npm test src/components/features/chat/content

# Test specific renderers
npm test MarkdownContent.test.tsx
npm test HtmlContent.test.tsx
npm test LinkPreview.test.tsx
```

## Common Commands
```bash
npm run dev                    # Start development server
npm test                      # Run tests
npm run lint                  # Check code style
npm run type-check           # TypeScript validation
```