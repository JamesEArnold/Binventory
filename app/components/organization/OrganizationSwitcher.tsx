'use client';

import { FC, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useOrganization } from '@/contexts/OrganizationContext';

export const OrganizationSwitcher: FC = () => {
  const { 
    context, 
    organizations, 
    currentOrganization, 
    switchContext,
    isLoading
  } = useOrganization();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Switch context without navigation (for toggle buttons)
  const handleSwitchContextOnly = (newContext: { type: 'personal' } | { type: 'organization', id: string }) => {
    switchContext({ ...newContext, skipNavigation: true });
    setIsOpen(false);
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Combined status indicator and dropdown trigger */}
      <button
        type="button"
        onClick={toggleDropdown}
        className={`
          flex items-center px-3 py-1.5 text-sm font-medium rounded-full
          ${context.type === 'organization' && currentOrganization 
            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
            : 'bg-gray-100 text-gray-700 border border-gray-200'}
          hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-expanded={isOpen}
      >
        {/* Context appropriate icon */}
        {context.type === 'organization' && currentOrganization ? (
          <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        ) : (
          <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        )}
        
        {/* Display name */}
        <span className="truncate max-w-[150px]">
          {context.type === 'organization' && currentOrganization 
            ? currentOrganization.name
            : 'Personal'}
        </span>
        
        {/* Dropdown indicator */}
        <svg 
          className={`ml-1.5 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute left-0 z-10 mt-2 w-60 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1 divide-y divide-gray-100">
            {/* Personal context option with toggle */}
            <div className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
              {/* Link that navigates to home */}
              <Link href="/" className="flex items-center text-sm text-gray-700 flex-grow">
                <svg className="mr-3 h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span className="flex-grow text-left">Personal</span>
              </Link>
              
              {/* Toggle that only switches context */}
              <div className="relative inline-block flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleSwitchContextOnly({ type: 'personal' })}
                  className={`
                    relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                    transition-colors duration-200 ease-in-out focus:outline-none
                    ${context.type === 'personal' ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                  aria-pressed={context.type === 'personal'}
                >
                  <span className="sr-only">Use personal context</span>
                  <span
                    className={`
                      pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 
                      transition duration-200 ease-in-out
                      ${context.type === 'personal' ? 'translate-x-4' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            </div>
            
            {/* Organizations section */}
            <div className="pt-1">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500">
                Organizations
              </div>
              
              {isLoading ? (
                <div className="px-4 py-2 text-sm text-gray-700">
                  Loading organizations...
                </div>
              ) : organizations.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-700">
                  No organizations found
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {organizations.map(org => (
                    <div key={org.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                      {/* Link that navigates to organization page */}
                      <Link 
                        href={`/organizations/${org.id}`}
                        className="flex items-center text-sm text-gray-700 flex-grow"
                      >
                        <svg className="mr-3 h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                        <span className="flex-grow text-left truncate">{org.name}</span>
                      </Link>
                      
                      {/* Toggle that only switches context */}
                      <div className="relative inline-block flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSwitchContextOnly({ type: 'organization', id: org.id })}
                          className={`
                            relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                            transition-colors duration-200 ease-in-out focus:outline-none
                            ${context.type === 'organization' && context.id === org.id ? 'bg-blue-600' : 'bg-gray-200'}
                          `}
                          aria-pressed={context.type === 'organization' && context.id === org.id}
                        >
                          <span className="sr-only">Switch to {org.name}</span>
                          <span
                            className={`
                              pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 
                              transition duration-200 ease-in-out
                              ${context.type === 'organization' && context.id === org.id ? 'translate-x-4' : 'translate-x-0'}
                            `}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Create new organization link */}
              <Link 
                href="/organizations/new" 
                className="text-blue-600 group flex w-full items-center px-4 py-2 text-sm hover:bg-gray-50"
              >
                <svg className="mr-3 h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Create New Organization
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 