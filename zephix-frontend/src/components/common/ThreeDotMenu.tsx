import React, { useState, useRef, useEffect } from 'react';

interface MenuItem {
  icon?: string;
  label?: string;
  onClick?: () => void;
  danger?: boolean;
  type?: 'divider';
}

interface ThreeDotMenuProps {
  items: MenuItem[];
  size?: 'sm' | 'md';
}

export const ThreeDotMenu: React.FC<ThreeDotMenuProps> = ({ items, size = 'md' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (e: React.MouseEvent, onClick?: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
    setIsOpen(false);
  };

  const buttonSize = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`${buttonSize} flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
          {items.map((item, index) => {
            if (item.type === 'divider') {
              return <div key={index} className="h-px bg-gray-200 my-1" />;
            }

            return (
              <button
                key={index}
                onClick={(e) => handleItemClick(e, item.onClick)}
                className={`
                  w-full text-left px-4 py-2 text-sm flex items-center
                  ${item.danger 
                    ? 'text-red-600 hover:bg-red-50' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {item.icon && <span className="mr-3">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

