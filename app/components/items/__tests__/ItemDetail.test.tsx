/**
 * @description Tests for ItemDetail component from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ItemDetail } from '../ItemDetail';
import { Item, BinItem } from '../../../types/models';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockedLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockedLink.displayName = 'Link';
  return MockedLink;
});

describe('ItemDetail', () => {
  // Setup common test state
  const mockItem: Item = {
    id: 'item123',
    name: 'Test Item',
    description: 'Test item description',
    categoryId: 'cat1',
    quantity: 10,
    minQuantity: 5,
    unit: 'pcs',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBins: Array<BinItem & { item?: Item }> = [
    {
      binId: 'bin1',
      itemId: 'item123',
      quantity: 7,
      addedAt: new Date(),
      item: mockItem,
    },
    {
      binId: 'bin2',
      itemId: 'item123',
      quantity: 3,
      addedAt: new Date(),
      item: mockItem,
    },
  ];

  const mockHandlers = {
    onQuantityChange: jest.fn(),
    onMove: jest.fn(),
    onEdit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    describe('basic item details', () => {
      it('should render item name', () => {
        render(<ItemDetail item={mockItem} />);
        expect(screen.getByText('Test Item')).toBeInTheDocument();
      });

      it('should render item description', () => {
        render(<ItemDetail item={mockItem} />);
        expect(screen.getByText('Test item description')).toBeInTheDocument();
      });

      it('should render item category', () => {
        render(<ItemDetail item={mockItem} />);
        expect(screen.getByText('cat1')).toBeInTheDocument();
      });

      it('should render quantity and unit', () => {
        render(<ItemDetail item={mockItem} />);
        expect(screen.getByText('10 pcs')).toBeInTheDocument();
      });

      it('should render minimum quantity', () => {
        render(<ItemDetail item={mockItem} />);
        expect(screen.getByText(/Minimum: 5 pcs/)).toBeInTheDocument();
      });
    });

    describe('quantity controls', () => {
      it('should not render quantity controls when onQuantityChange is not provided', () => {
        render(<ItemDetail item={mockItem} />);
        
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
      });

      it('should render quantity controls when onQuantityChange is provided', () => {
        render(<ItemDetail item={mockItem} onQuantityChange={mockHandlers.onQuantityChange} />);
        
        const decrementButton = screen.getByRole('button', { name: /decrement/i });
        const incrementButton = screen.getByRole('button', { name: /increment/i });
        
        expect(decrementButton).toBeInTheDocument();
        expect(incrementButton).toBeInTheDocument();
      });

      it('should disable decrement button when quantity is 0', () => {
        const itemWithZeroQuantity = { ...mockItem, quantity: 0 };
        render(<ItemDetail item={itemWithZeroQuantity} onQuantityChange={mockHandlers.onQuantityChange} />);
        
        const decrementButton = screen.getByRole('button', { name: /decrement/i });
        
        expect(decrementButton).toBeDisabled();
      });
    });

    describe('storage locations', () => {
      it('should not render storage locations section when bins are not provided', () => {
        render(<ItemDetail item={mockItem} />);
        
        expect(screen.queryByText('Storage Locations')).not.toBeInTheDocument();
      });

      it('should render storage locations when bins are provided', () => {
        render(<ItemDetail item={mockItem} bins={mockBins} />);
        
        expect(screen.getByText('Storage Locations')).toBeInTheDocument();
        expect(screen.getByText('bin1')).toBeInTheDocument();
        expect(screen.getByText('bin2')).toBeInTheDocument();
      });

      it('should not render move controls when onMove is not provided', () => {
        render(<ItemDetail item={mockItem} bins={mockBins} />);
        
        expect(screen.queryByText('Move to another bin')).not.toBeInTheDocument();
      });

      it('should render move controls when onMove is provided', () => {
        render(<ItemDetail item={mockItem} bins={mockBins} onMove={mockHandlers.onMove} />);
        
        expect(screen.getByText('Move to another bin')).toBeInTheDocument();
        expect(screen.getByText('Select destination bin')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Move/i })).toBeInTheDocument();
      });
    });

    describe('edit button', () => {
      it('should not render edit button when onEdit is not provided', () => {
        render(<ItemDetail item={mockItem} />);
        
        expect(screen.queryByText('Edit Item')).not.toBeInTheDocument();
      });

      it('should render edit button when onEdit is provided', () => {
        render(<ItemDetail item={mockItem} onEdit={mockHandlers.onEdit} />);
        
        expect(screen.getByText('Edit Item')).toBeInTheDocument();
      });
    });
  });

  describe('interactions', () => {
    describe('quantity controls', () => {
      it('should increment quantity when increment button is clicked', () => {
        render(<ItemDetail item={mockItem} onQuantityChange={mockHandlers.onQuantityChange} />);
        
        const incrementButton = screen.getByRole('button', { name: /increment/i });
        fireEvent.click(incrementButton);
        
        expect(mockHandlers.onQuantityChange).toHaveBeenCalledWith(11);
      });

      it('should decrement quantity when decrement button is clicked', () => {
        render(<ItemDetail item={mockItem} onQuantityChange={mockHandlers.onQuantityChange} />);
        
        const decrementButton = screen.getByRole('button', { name: /decrement/i });
        fireEvent.click(decrementButton);
        
        expect(mockHandlers.onQuantityChange).toHaveBeenCalledWith(9);
      });

      it('should not allow quantity to go below 0', () => {
        const itemWithOneQuantity = { ...mockItem, quantity: 1 };
        render(<ItemDetail item={itemWithOneQuantity} onQuantityChange={mockHandlers.onQuantityChange} />);
        
        const decrementButton = screen.getByRole('button', { name: /decrement/i });
        fireEvent.click(decrementButton);
        fireEvent.click(decrementButton); // Try to go below zero
        
        expect(mockHandlers.onQuantityChange).toHaveBeenCalledTimes(1);
        expect(mockHandlers.onQuantityChange).toHaveBeenCalledWith(0);
      });
    });

    describe('move functionality', () => {
      it('should handle item move when move button is clicked', () => {
        render(<ItemDetail item={mockItem} bins={mockBins} onMove={mockHandlers.onMove} />);
        
        // Select source bin
        const sourceBinRadio = screen.getByRole('radio', { name: /bin1/i });
        fireEvent.click(sourceBinRadio);
        
        // Select destination bin
        const destinationSelect = screen.getByRole('combobox');
        fireEvent.change(destinationSelect, { target: { value: 'bin2' } });
        
        // Click move button
        const moveButton = screen.getByRole('button', { name: /Move/i });
        fireEvent.click(moveButton);
        
        expect(mockHandlers.onMove).toHaveBeenCalledWith('bin1', 'bin2');
      });

      it('should disable move button when no source bin is selected', () => {
        render(<ItemDetail item={mockItem} bins={mockBins} onMove={mockHandlers.onMove} />);
        
        // Select destination bin without selecting source
        const destinationSelect = screen.getByRole('combobox');
        fireEvent.change(destinationSelect, { target: { value: 'bin2' } });
        
        // Check if move button is disabled
        const moveButton = screen.getByRole('button', { name: /Move/i });
        expect(moveButton).toBeDisabled();
      });

      it('should disable move button when no destination bin is selected', () => {
        render(<ItemDetail item={mockItem} bins={mockBins} onMove={mockHandlers.onMove} />);
        
        // Select source bin without selecting destination
        const sourceBinRadio = screen.getByRole('radio', { name: /bin1/i });
        fireEvent.click(sourceBinRadio);
        
        // Check if move button is disabled
        const moveButton = screen.getByRole('button', { name: /Move/i });
        expect(moveButton).toBeDisabled();
      });
    });

    describe('edit functionality', () => {
      it('should call onEdit when edit button is clicked', () => {
        render(<ItemDetail item={mockItem} onEdit={mockHandlers.onEdit} />);
        
        const editButton = screen.getByText('Edit Item');
        fireEvent.click(editButton);
        
        expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockItem);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle items without minQuantity', () => {
      const itemWithoutMin = { ...mockItem, minQuantity: null };
      render(<ItemDetail item={itemWithoutMin} />);
      
      expect(screen.queryByText(/Minimum:/)).not.toBeInTheDocument();
    });

    it('should show low stock warning when quantity is below minimum', () => {
      const lowStockItem = { ...mockItem, quantity: 3, minQuantity: 5 };
      render(<ItemDetail item={lowStockItem} />);
      
      expect(screen.getByText('Low stock!')).toBeInTheDocument();
    });

    it('should not show low stock warning when quantity is at or above minimum', () => {
      const adequateStockItem = { ...mockItem, quantity: 5, minQuantity: 5 };
      render(<ItemDetail item={adequateStockItem} />);
      
      expect(screen.queryByText('Low stock!')).not.toBeInTheDocument();
    });
  });
}); 