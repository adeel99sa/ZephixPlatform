import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultActiveTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
  tabListClassName?: string;
  tabContentClassName?: string;
}

const Tabs: React.FC<TabsProps> = ({
  items,
  defaultActiveTab,
  onTabChange,
  className,
  tabListClassName,
  tabContentClassName,
}) => {
  const [activeTab, setActiveTab] = useState(
    defaultActiveTab || items.find(item => !item.disabled)?.id || items[0]?.id
  );
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleTabChange = (tabId: string) => {
    const tab = items.find(item => item.id === tabId);
    if (tab && !tab.disabled) {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    const currentIndex = items.findIndex(item => item.id === tabId);
    const enabledItems = items.filter(item => !item.disabled);
    const currentEnabledIndex = enabledItems.findIndex(item => item.id === tabId);

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentEnabledIndex > 0 ? currentEnabledIndex - 1 : enabledItems.length - 1;
        const prevTab = enabledItems[prevIndex];
        if (prevTab) {
          handleTabChange(prevTab.id);
          tabRefs.current.get(prevTab.id)?.focus();
        }
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentEnabledIndex < enabledItems.length - 1 ? currentEnabledIndex + 1 : 0;
        const nextTab = enabledItems[nextIndex];
        if (nextTab) {
          handleTabChange(nextTab.id);
          tabRefs.current.get(nextTab.id)?.focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        const firstTab = enabledItems[0];
        if (firstTab) {
          handleTabChange(firstTab.id);
          tabRefs.current.get(firstTab.id)?.focus();
        }
        break;
      case 'End':
        e.preventDefault();
        const lastTab = enabledItems[enabledItems.length - 1];
        if (lastTab) {
          handleTabChange(lastTab.id);
          tabRefs.current.get(lastTab.id)?.focus();
        }
        break;
    }
  };

  const activeTabContent = items.find(item => item.id === activeTab)?.content;

  return (
    <div className={cn("w-full", className)}>
      {/* Tab List */}
      <div
        ref={tabListRef}
        role="tablist"
        className={cn("flex border-b", tabListClassName)}
        aria-label="Tabs"
      >
        {items.map((item) => (
          <button
            key={item.id}
            ref={(el) => {
              if (el) {
                tabRefs.current.set(item.id, el);
              } else {
                tabRefs.current.delete(item.id);
              }
            }}
            role="tab"
            aria-selected={activeTab === item.id}
            aria-controls={`tabpanel-${item.id}`}
            aria-disabled={item.disabled}
            tabIndex={activeTab === item.id ? 0 : -1}
            disabled={item.disabled}
            onClick={() => handleTabChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, item.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              activeTab === item.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
              item.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className={cn("p-4", tabContentClassName)}
      >
        {activeTabContent}
      </div>
    </div>
  );
};

export { Tabs };
