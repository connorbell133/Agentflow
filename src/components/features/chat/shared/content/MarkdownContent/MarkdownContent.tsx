import { useMemo } from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LinkPreview } from "@/components/features/chat/shared/content/LinkPreview/LinkPreview";
import { sanitizeUserInput } from '@/lib/security/sanitize';
import { MarkdownContentProps } from "./MarkdownContent.types";

const MarkdownContent: React.FC<MarkdownContentProps> = ({ markdown }) => {
  // Sanitize the markdown to prevent XSS attacks
  const sanitizedMarkdown = useMemo(() => sanitizeUserInput(markdown), [markdown]);
  
  return (
    <ReactMarkdown
      className="prose dark:prose-invert max-w-none text-foreground"
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <LinkPreview
            url={href!}
            className="font-bold bg-clip-text text-transparent bg-gradient-to-br from-purple-500 to-pink-500"
          >
            {children}
          </LinkPreview>
        ),
      }}
    >
      {sanitizedMarkdown}
    </ReactMarkdown>
  );
};

export default MarkdownContent;
