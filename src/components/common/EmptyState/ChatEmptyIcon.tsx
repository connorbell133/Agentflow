import React from 'react';

interface ChatEmptyIconProps {
  className?: string;
}

export const ChatEmptyIcon: React.FC<ChatEmptyIconProps> = ({ className = '' }) => {
  return (
    <svg
      className={`group ${className}`}
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="10"
        y="20"
        width="80"
        height="60"
        rx="8"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2"
        className="group-hover:fillOpacity-[0.15] transition-all duration-300"
      />

      <rect x="20" y="35" width="40" height="8" rx="4" fill="currentColor" fillOpacity="0.2" />
      <rect x="20" y="50" width="50" height="8" rx="4" fill="currentColor" fillOpacity="0.2" />

      <rect
        x="30"
        y="80"
        width="70"
        height="45"
        rx="8"
        fill="currentColor"
        fillOpacity="0.05"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 4"
        className="group-hover:strokeDasharray-[8,8] transition-all duration-300"
      />

      <circle
        cx="85"
        cy="85"
        r="25"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2"
        className="group-hover:r-[27] transition-all duration-300"
      />
      <path
        d="M75 85 L82 92 L95 77"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300 group-hover:translate-y-[-2px]"
      />

      <circle cx="15" cy="15" r="3" fill="currentColor" fillOpacity="0.3" />
      <circle cx="105" cy="15" r="3" fill="currentColor" fillOpacity="0.3" />
      <circle cx="15" cy="105" r="3" fill="currentColor" fillOpacity="0.3" />

      <path
        d="M25 10 L35 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fillOpacity="0.3"
      />
      <path
        d="M85 10 L95 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fillOpacity="0.3"
      />
    </svg>
  );
};

export default ChatEmptyIcon;
