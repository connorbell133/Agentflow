import { useMemo } from 'react';
import { HtmlContentProps } from "./HtmlContent.types";
import { sanitizeHtml } from '@/lib/security/sanitize';

const HtmlContent: React.FC<HtmlContentProps> = ({ html }) => {
  const sanitized = useMemo(() => sanitizeHtml(html), [html]);
  
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: sanitized }}
      className="sanitized-content"
    />
  );
};

export default HtmlContent;
