/**
 * @description Tests for BinCard component from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { BinCard } from '../BinCard';
import { Bin } from '../../../types/models';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockedLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockedLink.displayName = 'Link';
  return MockedLink;
});

describe('BinCard', () => {
  // Setup common test state
  const mockBin: Bin = {
    id: '123',
    label: 'Test Bin',
    location: 'Shelf A',
    qrCode: 'qr123',
    description: 'Test bin description',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockItems = [
    {
      binId: '123',
      itemId: 'item1',
      quantity: 5,
      addedAt: new Date(),
      item: { name: 'Item 1' },
    },
    {
      binId: '123',
      itemId: 'item2',
      quantity: 3,
      addedAt: new Date(),
      item: { name: 'Item 2' },
    },
  ];

  const mockHandlers = {
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onScan: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    describe('basic elements', () => {
      it('should render bin label and location', () => {
        render(<BinCard bin={mockBin} />);
        
        expect(screen.getByText('Test Bin')).toBeInTheDocument();
        expect(screen.getByText('Shelf A')).toBeInTheDocument();
      });

      it('should render bin description when not compact', () => {
        render(<BinCard bin={mockBin} compact={false} />);
        
        expect(screen.getByText('Test bin description')).toBeInTheDocument();
      });

      it('should not render bin description when compact', () => {
        render(<BinCard bin={mockBin} compact={true} />);
        
        expect(screen.queryByText('Test bin description')).not.toBeInTheDocument();
      });
    });

    describe('items display', () => {
      it('should render item count when not compact', () => {
        render(<BinCard bin={mockBin} items={mockItems} />);
        
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('items')).toBeInTheDocument();
      });

      it('should use singular form for one item', () => {
        render(<BinCard bin={mockBin} items={[mockItems[0]]} />);
        
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('item')).toBeInTheDocument();
      });

      it('should show top items when not compact', () => {
        render(<BinCard bin={mockBin} items={mockItems} />);
        
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });

      it('should show "View all" link when more than 3 items', () => {
        const manyItems = [
          ...mockItems,
          {
            binId: '123',
            itemId: 'item3',
            quantity: 2,
            addedAt: new Date(),
            item: { name: 'Item 3' },
          },
          {
            binId: '123',
            itemId: 'item4',
            quantity: 1,
            addedAt: new Date(),
            item: { name: 'Item 4' },
          },
        ];
        
        render(<BinCard bin={mockBin} items={manyItems} />);
        
        expect(screen.getByText(/View all 4 items/)).toBeInTheDocument();
      });
    });

    describe('action buttons', () => {
      it('should not render action buttons when handlers are not provided', () => {
        render(<BinCard bin={mockBin} />);
        
        expect(screen.queryByLabelText('Edit bin')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Delete bin')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Scan QR code')).not.toBeInTheDocument();
      });

      it('should render edit button when onEdit handler is provided', () => {
        render(<BinCard bin={mockBin} onEdit={mockHandlers.onEdit} />);
        
        expect(screen.getByLabelText('Edit bin')).toBeInTheDocument();
      });

      it('should render delete button when onDelete handler is provided', () => {
        render(<BinCard bin={mockBin} onDelete={mockHandlers.onDelete} />);
        
        expect(screen.getByLabelText('Delete bin')).toBeInTheDocument();
      });

      it('should render scan button when onScan handler is provided', () => {
        render(<BinCard bin={mockBin} onScan={mockHandlers.onScan} />);
        
        expect(screen.getByLabelText('Scan QR code')).toBeInTheDocument();
      });
    });
  });

  describe('interactions', () => {
    describe('action buttons', () => {
      it('should call onEdit when edit button is clicked', () => {
        render(<BinCard bin={mockBin} onEdit={mockHandlers.onEdit} />);
        
        fireEvent.click(screen.getByLabelText('Edit bin'));
        
        expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockBin);
      });

      it('should call onDelete when delete button is clicked', () => {
        render(<BinCard bin={mockBin} onDelete={mockHandlers.onDelete} />);
        
        fireEvent.click(screen.getByLabelText('Delete bin'));
        
        expect(mockHandlers.onDelete).toHaveBeenCalledWith('123');
      });

      it('should call onScan when scan button is clicked', () => {
        render(<BinCard bin={mockBin} onScan={mockHandlers.onScan} />);
        
        fireEvent.click(screen.getByLabelText('Scan QR code'));
        
        expect(mockHandlers.onScan).toHaveBeenCalledWith('123');
      });
    });

    describe('navigation', () => {
      it('should link to bin detail page', () => {
        render(<BinCard bin={mockBin} />);
        
        const binLink = screen.getByText('Test Bin').closest('a');
        expect(binLink).toHaveAttribute('href', '/bins/123');
      });

      it('should link to item detail pages for each item', () => {
        render(<BinCard bin={mockBin} items={mockItems} />);
        
        const item1Link = screen.getByText('Item 1').closest('a');
        const item2Link = screen.getByText('Item 2').closest('a');
        
        expect(item1Link).toHaveAttribute('href', '/items/item1');
        expect(item2Link).toHaveAttribute('href', '/items/item2');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle items without item property', () => {
      const incompleteItems = [
        {
          binId: '123',
          itemId: 'item1',
          quantity: 5,
          addedAt: new Date(),
        },
      ];
      
      render(<BinCard bin={mockBin} items={incompleteItems} />);
      
      expect(screen.getByText('Unknown item')).toBeInTheDocument();
    });

    it('should handle bins without description', () => {
      const binWithoutDesc = { ...mockBin, description: null };
      
      render(<BinCard bin={binWithoutDesc} />);
      
      expect(screen.queryByText('Test bin description')).not.toBeInTheDocument();
    });
  });
}); 