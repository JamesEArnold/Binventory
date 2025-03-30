/**
 * @description Tests for Navigation component from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { render, screen } from '@testing-library/react';
import { Navigation } from '../Navigation';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockedLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockedLink.displayName = 'Link';
  return MockedLink;
});

describe('Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    describe('branding', () => {
      it('should render the application name', () => {
        render(<Navigation />);
        
        expect(screen.getByText('Binventory')).toBeInTheDocument();
      });
      
      it('should link the application name to the home page', () => {
        render(<Navigation />);
        
        const homeLink = screen.getByText('Binventory').closest('a');
        expect(homeLink).toHaveAttribute('href', '/');
      });
    });

    describe('navigation links', () => {
      it('should render main navigation links', () => {
        render(<Navigation />);
        
        expect(screen.getByText('Bins')).toBeInTheDocument();
        expect(screen.getByText('Items')).toBeInTheDocument();
        expect(screen.getByText('Categories')).toBeInTheDocument();
      });
      
      it('should link to the correct routes', () => {
        render(<Navigation />);
        
        const binsLink = screen.getByText('Bins').closest('a');
        const itemsLink = screen.getByText('Items').closest('a');
        const categoriesLink = screen.getByText('Categories').closest('a');
        
        expect(binsLink).toHaveAttribute('href', '/bins');
        expect(itemsLink).toHaveAttribute('href', '/items');
        expect(categoriesLink).toHaveAttribute('href', '/categories');
      });
    });

    describe('search', () => {
      it('should render the search input', () => {
        render(<Navigation />);
        
        expect(screen.getByPlaceholderText('Search items, bins...')).toBeInTheDocument();
      });
      
      it('should have a search icon', () => {
        render(<Navigation />);
        
        // We can't easily test for SVG content, so we'll check for the element role and verify it's near the input
        const searchInput = screen.getByPlaceholderText('Search items, bins...');
        expect(searchInput.parentElement).toContainElement(searchInput.parentElement?.querySelector('svg'));
      });
    });

    describe('notifications', () => {
      it('should render a notifications button', () => {
        render(<Navigation />);
        
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        // Check that it contains an SVG
        expect(button).toContainElement(button.querySelector('svg'));
      });
      
      it('should show a notification count badge', () => {
        render(<Navigation />);
        
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have a semantic navigation element', () => {
      render(<Navigation />);
      
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
    
    it('should have accessible buttons with appropriate roles', () => {
      render(<Navigation />);
      
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
    
    it('should have a search input with a search type', () => {
      render(<Navigation />);
      
      expect(screen.getByPlaceholderText('Search items, bins...')).toHaveAttribute('type', 'search');
    });
  });

  describe('responsive design', () => {
    it('should have responsive classes for search input width', () => {
      render(<Navigation />);
      
      const searchInput = screen.getByPlaceholderText('Search items, bins...');
      expect(searchInput.className).toContain('w-full md:w-64');
    });
  });
}); 