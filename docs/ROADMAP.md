# Binventory System Roadmap

## Project Overview
Binventory is a modern inventory management system designed for organizing items in physical bins using QR codes and human-readable labels. The system enables users to quickly locate items, manage inventory, and maintain an organized space through an intuitive web interface and mobile scanning capabilities.

## System Architecture Overview
- **Frontend**: Next.js React application with PWA capabilities
- **Backend**: Next.js API Routes (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Search**: MeiliSearch for fast, typo-tolerant search
- **Storage**: Cloud storage for images and QR codes
- **Authentication**: JWT-based auth system

## Implementation Phases

### Phase 1: Core Infrastructure and Basic Bin Management

#### Phase 1.1: Database Schema and Core API ✓
**Context**: Foundation for all data operations
- Implementation Priority: High
- Dependencies: None
- Status: Completed
- Technical Stack:
  - PostgreSQL
  - Next.js API Routes
  - Prisma ORM
  - Zod for validation

**Completed Implementation**:

1. Database Schema Implementation:
   - Location: `prisma/schema.prisma`
   - Implementation: Full Prisma schema with relations
   - Key features:
     - Bins, Items, Categories, and BinItems models
     - Proper relations and constraints
     - Indexed fields for performance
   - Reference: Prisma schema with TypeScript integration

2. API Routes Implementation:
   - Location: `app/api/*`
   - Implementation: Next.js API Routes with type-safe handlers
   - Key features:
     - RESTful endpoints for all core entities
     - Zod validation for request/response
     - Error handling middleware
   - Reference: App Router API implementation

3. Core Services:
   - Location: `app/services/*`
   - Implementation: Service layer pattern
   - Key features:
     - Separation of concerns
     - Type-safe database operations
     - Business logic encapsulation
   - Reference: Service pattern implementation

**Detailed Specifications**:

1. Database Schemas:
```typescript
interface Bin {
  id: string;              // UUID
  label: string;           // Max 100 chars, unique
  location: string;        // Max 200 chars
  qr_code: string;         // URL-safe string
  description?: string;    // Optional, max 500 chars
  created_at: DateTime;    // ISO 8601
  updated_at: DateTime;    // ISO 8601
  
  // Indexes
  @Index(['label'])
  @Index(['location'])
}

interface Item {
  id: string;              // UUID
  name: string;           // Max 200 chars
  description: string;    // Max 1000 chars
  category_id: string;    // Foreign key
  quantity: number;       // Default 0, non-negative
  min_quantity?: number;  // Optional threshold
  unit: string;          // e.g., "pieces", "kg"
  created_at: DateTime;
  updated_at: DateTime;
  
  // Indexes
  @Index(['name'])
  @Index(['category_id'])
}

interface BinItem {
  bin_id: string;        // Foreign key
  item_id: string;       // Foreign key
  quantity: number;      // Non-negative
  added_at: DateTime;
  notes?: string;        // Optional, max 500 chars
  
  // Constraints
  @PrimaryKey(['bin_id', 'item_id'])
  @ForeignKey(() => Bin, 'id')
  @ForeignKey(() => Item, 'id')
}

interface Category {
  id: string;           // UUID
  name: string;         // Max 100 chars
  parent_id?: string;   // Optional self-reference
  path: string[];       // Materialized path
  
  // Indexes
  @Index(['name'])
  @Index(['path'])
}
```

2. API Endpoints:

```typescript
// Bins API
interface BinEndpoints {
  // GET /api/bins
  list: {
    query: {
      page?: number;
      limit?: number;
      location?: string;
      search?: string;
    };
    response: ApiResponse<Bin[]>;
  };
  
  // POST /api/bins
  create: {
    body: Omit<Bin, 'id' | 'created_at' | 'updated_at' | 'qr_code'>;
    response: ApiResponse<Bin>;
  };
  
  // GET /api/bins/:id
  get: {
    params: { id: string };
    response: ApiResponse<Bin & { items: BinItem[] }>;
  };
  
  // PUT /api/bins/:id
  update: {
    params: { id: string };
    body: Partial<Bin>;
    response: ApiResponse<Bin>;
  };
  
  // DELETE /api/bins/:id
  delete: {
    params: { id: string };
    response: ApiResponse<void>;
  };
}

// Similar interfaces for Items, Categories, and BinItems...
```

3. Validation Rules:
```typescript
const BinValidation = {
  label: {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9-_]+$/,
    unique: true
  },
  location: {
    required: true,
    maxLength: 200
  },
  // ... more rules
};

// Similar validation rules for other entities
```

#### Phase 1.2: QR Code System ✓
**Context**: Handles generation and management of QR codes for bins
- Implementation Priority: High
- Dependencies: Phase 1.1
- Status: Completed
- Technical Requirements:
  - QR code generation library
  - Image storage solution
  - URL shortener service (optional)

**Detailed Specifications**:

1. QR Code Format:
```typescript
interface QRCodeData {
  version: string;        // Format version
  binId: string;         // UUID of bin
  shortCode: string;     // Short URL-safe code
  timestamp: number;     // Generation timestamp
  checksum: string;      // Security checksum
}

interface QRCodeConfig {
  size: number;          // 300px default
  errorCorrection: 'L' | 'M' | 'Q' | 'H';  // 'M' default
  format: 'PNG' | 'SVG';  // 'SVG' default
  margin: number;        // 4 modules default
}
```

2. URL Structure:
```typescript
const URL_PATTERNS = {
  bin: '/b/:shortCode',      // Short URL for QR codes
  binDirect: '/bins/:binId', // Direct access URL
  qrImage: '/qr/:binId.svg'  // QR code image URL
};

interface URLConfig {
  baseUrl: string;           // Base URL for QR codes
  shortCodeLength: number;   // Length of short codes (default: 8)
  expirationDays?: number;   // Optional expiration for URLs
}
```

3. Storage Requirements:
```typescript
interface QRStorageConfig {
  images: {
    format: 'SVG',
    maxSize: '50KB',
    path: 'qr-codes/',
    naming: '{binId}-{timestamp}.svg'
  },
  cache: {
    engine: 'Redis',
    ttl: '24h',
    prefix: 'qr:'
  }
}
```

### Phase 2: Search and Discovery

#### Phase 2.1: Search Infrastructure ✓
**Context**: Enables fast and accurate item discovery
- Implementation Priority: High
- Dependencies: Phase 1.1
- Status: Completed
- Technical Stack:
  - MeiliSearch
  - Next.js API Routes
  - TypeScript
  - Zod for validation

**Completed Implementation**:

1. Search Service Implementation:
   - Location: `app/services/search.ts`
   - Implementation: MeiliSearch integration with type-safe search service
   - Key features:
     - Index management for items and bins
     - Type-ahead search functionality
     - Multi-index search capabilities
     - Error handling and fallbacks
   - Reference: Factory pattern with service layer integration

2. API Routes Implementation:
   - Location: `app/api/search/route.ts`
   - Implementation: RESTful API for search operations
   - Key features:
     - Full text search endpoint
     - Typeahead search endpoint
     - Query validation with Zod
     - Proper error handling
   - Reference: Next.js API Routes with validation

3. Integration with Core Services:
   - Location: `app/services/bin.ts`
   - Implementation: Integrated with bin service for automatic indexing
   - Key features:
     - Automatic index updates on CRUD operations
     - Fallback to database search when needed
     - Graceful error handling
   - Reference: Service composition pattern

4. Test Suite Implementation:
   - Location: `app/services/__tests__/search.test.ts`
   - Implementation: Jest tests for search functionality
   - Key features:
     - Unit tests for core search operations
     - Mocking for MeiliSearch integration
     - Verification of typeahead functionality
     - Error scenario testing
   - Reference: Jest with mock patterns for external services

**Detailed Specifications**:

1. Search Indices:
```typescript
interface SearchIndices {
  items: {
    primaryKey: 'id',
    searchableAttributes: [
      'name',
      'description',
      'category.name'
    ],
    filterableAttributes: [
      'category_id',
      'quantity',
      'unit'
    ],
    sortableAttributes: [
      'name',
      'created_at',
      'quantity'
    ],
    ranking: [
      'typo',
      'words',
      'proximity',
      'attribute',
      'exactness'
    ]
  },
  bins: {
    primaryKey: 'id',
    searchableAttributes: [
      'label',
      'location',
      'description'
    ],
    filterableAttributes: [
      'location'
    ]
  }
}
```

2. Typeahead Configuration:
```typescript
interface TypeaheadConfig {
  minChars: 2,
  maxResults: 10,
  timeout: 150, // ms
  indexes: ['items', 'bins'],
  weights: {
    name: 10,
    label: 8,
    description: 3
  }
}
```

### Phase 3: User Interface and Mobile Experience

#### Phase 3.1: Core Web Interface ✓
**Context**: Primary user interface for desktop and mobile web browsers
- Implementation Priority: High
- Dependencies: Phase 1.1, Phase 1.2
- Status: Completed
- Technical Stack:
  - Next.js
  - TailwindCSS
  - React Server Components
  - Responsive design system

**Completed Implementation**:

1. Design System Implementation:
   - Location: `app/components/ui/design-system.ts`
   - Implementation: TypeScript-based design tokens
   - Key features:
     - Color system with semantic variables
     - Typography scale
     - Spacing scale
     - Responsive breakpoints
   - Reference: Modern design system with consistent values

2. Core UI Components:
   - Location: `app/components/bins/BinCard.tsx`, `app/components/items/ItemDetail.tsx`
   - Implementation: React components following UI design patterns
   - Key features:
     - Responsive layouts
     - Interactive elements
     - Consistent styling
     - Accessibility support
   - Reference: Component-based architecture with props pattern

3. Page Layouts Implementation:
   - Location: `app/bins/page.tsx`, `app/bins/[id]/page.tsx`
   - Implementation: Next.js App Router pages with server components
   - Key features:
     - Dashboard overview
     - List views
     - Detail views
     - Navigation structure
   - Reference: Server component patterns with data fetching

4. Responsive Design:
   - Location: Throughout components
   - Implementation: TailwindCSS responsive utilities
   - Key features:
     - Mobile-first approach
     - Adaptive layouts
     - Touch-friendly controls
     - Consistent spacing
   - Reference: Responsive design system with breakpoint consistency

5. Printable Bin Cards:
   - Location: `app/components/bins/PrintButton.tsx`
   - Implementation: Client-side React component with direct print functionality
   - Key features:
     - Print-optimized styling for physical labels
     - Single-button printing without extra steps
     - Correctly sized for physical attachment to bins (4in × 3in)
     - QR code integration for scanning
     - Key information display (label, location, ID)
   - Reference: Client component pattern with browser print API

6. Enhanced Print Functionality:
   - Location: `app/components/bins/PrintButton.tsx`
   - Implementation: Improved card printing with proper page layout and color preservation
   - Key features:
     - Small card size maintained on standard letter paper
     - Color preservation in printed output
     - Centered placement on page
     - Print-specific media queries
     - Automatic printing workflow
     - Square borders for easy cutting
     - Enlarged QR code with primary blue color theme
   - Reference: CSS print media optimization with color adjustments

7. Multi-Bin Printing Functionality:
   - Location: `app/components/bins/PrintButton.tsx`
   - Implementation: Grid-based multi-bin card printing with page optimization
   - Key features:
     - Multiple bin labels on a single page
     - Configurable grid layout (columns and rows)
     - Bin selection interface
     - Efficient paper usage
     - Page-break control for proper printing
     - Preview counts of labels per page
     - Maintains all customization options from single printing
   - Reference: CSS Grid Layout with print media optimization

8. Batch Print System:
   - Location: `app/components/bins/BatchPrintButton.tsx`
   - Implementation: Unified batch printing interface with direct integration
   - Key features:
     - Dashboard quick action for easy access
     - Bins page integration
     - Visual bin selection interface
     - Bins listing with details
     - Direct component integration without URL parameters
     - Seamless integration with print customization
   - Reference: React client components with direct state management

9. Customizable Print Functionality:
   - Location: `app/components/bins/PrintButton.tsx`
   - Implementation: User-configurable bin card printing with live preview
   - Key features:
     - Interactive modal with real-time preview
     - Color customization for header and QR code elements
     - Size adjustments for card dimensions and QR code
     - Style toggles for corners, description, and footer
     - Responsive design for all screen sizes
     - User preference persistence during the session
     - Template saving and management
     - LocalStorage persistence of saved templates
     - QR code preview in configuration interface
     - Proportionally accurate preview of printed output
     - Size indicators for better user understanding
     - Basic/Advanced mode toggle for user-appropriate complexity
     - Simplified interface for casual users
   - Reference: React hooks with dynamic styling and configuration management

**Detailed Specifications**:

1. Design System:
```typescript
interface DesignSystem {
  colors: {
    primary: '#0066CC',
    secondary: '#4C9AFF',
    success: '#36B37E',
    warning: '#FFAB00',
    error: '#FF5630',
    // ... more colors
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      // ... more sizes
    }
  },
  spacing: {
    unit: 4, // px
    // ... spacing scale
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px'
  }
}
```

#### Phase 3.2: Mobile Scanner Interface ✓
**Context**: Mobile-optimized interface for QR code scanning and quick actions
- Implementation Priority: High
- Dependencies: Phase 3.1
- Status: Completed
- Technical Stack:
  - React with React Hooks
  - Web Camera API
  - PWA capabilities
  - Local Storage for offline data

**Completed Implementation**:

1. Scanner Service Implementation:
   - Location: `app/services/scanner.ts`
   - Implementation: Scanner service with offline capabilities
   - Key features:
     - QR code processing
     - Offline queue system
     - Local storage persistence
     - Background sync capabilities
   - Reference: Service factory pattern with local storage integration

2. Scanner UI Components:
   - Location: `app/components/scanner/Scanner.tsx`, `app/components/scanner/QuickActions.tsx`
   - Implementation: React components for mobile scanning experience
   - Key features:
     - Camera access and preview
     - QR code frame targeting
     - Scan result display
     - Quick action interface
     - Flashlight control
     - Haptic feedback
   - Reference: React hooks pattern with canvas rendering

3. Mobile Scanner Routes:
   - Location: `app/scanner/page.tsx`
   - Implementation: Next.js page routing for scanner interface
   - Key features:
     - Context-aware scanner/action display
     - Error handling and recovery
     - Smooth transitions
     - Responsive layout
   - Reference: Client-side routing with query parameters

4. Navigation Integration:
   - Location: `app/components/layout/Navigation.tsx`
   - Implementation: Scanner button in main navigation
   - Key features:
     - Quick access scanner button
     - Consistent styling with main UI
     - Accessibility support
   - Reference: Consistent navigation component extension

**Success Criteria**:
- Sub-second QR code recognition
- Works offline
- Smooth transitions
- Battery efficient

### Phase 4: Advanced Features and Analytics

#### Phase 4.1: Inventory Analytics
**Context**: Data analysis and reporting system for inventory insights
- Implementation Priority: Medium
- Dependencies: Phase 1.1, Phase 2.1
- Technical Requirements:
  - Data visualization library
  - Analytics processing service
  - Export capabilities

**Implementation Tasks**:
1. Implement analytics features:
   - Usage patterns tracking
   - Item movement history
   - Space utilization metrics
   - Inventory value calculations

2. Create reporting system:
   - Custom report builder
   - Scheduled reports
   - Export to CSV/PDF
   - Data visualizations

**Success Criteria**:
- Reports generate within 3 seconds
- Data accuracy verified
- Interactive visualizations perform smoothly
- Export functionality works reliably

#### Phase 4.2: Smart Features
**Context**: AI/ML-powered features for inventory optimization
- Implementation Priority: Low
- Dependencies: Phase 4.1
- Technical Requirements:
  - Machine learning pipeline
  - Recommendation engine
  - Pattern recognition system

**Implementation Tasks**:
1. Implement smart features:
   - Reorder suggestions
   - Optimal bin placement
   - Usage predictions
   - Category suggestions

2. Create management interface:
   - Configuration dashboard
   - Model performance metrics
   - Training data management
   - Override controls

**Success Criteria**:
- Prediction accuracy > 85%
- System recommendations are actionable
- Performance impact minimal
- User feedback mechanism works

### Phase 5: Integration and Extensibility

#### Phase 5.1: External Integration System
**Context**: System for connecting with external services and data sources
- Implementation Priority: Medium
- Dependencies: Phase 1.1
- Technical Requirements:
  - API gateway
  - Webhook system
  - Rate limiting
  - Authentication system

**Implementation Tasks**:
1. Create integration framework:
   - REST API documentation
   - Webhook endpoints
   - OAuth2 implementation
   - Rate limiting system

2. Implement common integrations:
   - Shopping list export
   - Supplier inventory systems
   - Expense tracking
   - Calendar systems

**Success Criteria**:
- API documentation is complete
- Integrations work reliably
- Rate limiting effective
- Security audit passes

#### Phase 5.2: Customization Framework
**Context**: System for user customization and extensions
- Implementation Priority: Low
- Dependencies: Phase 5.1
- Technical Requirements:
  - Plugin architecture
  - Custom field system
  - Workflow engine
  - Template system

**Implementation Tasks**:
1. Build customization system:
   - Custom fields
   - Workflow rules
   - Label templates
   - Report templates

2. Create management interface:
   - Template editor
   - Workflow builder
   - Field configuration
   - Plugin management

**Success Criteria**:
- Custom fields work as expected
- Workflows execute reliably
- Templates render correctly
- Plugin system is stable

## Technical Standards

### API Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
    };
  };
}
```

### Error Handling
All errors should follow the structure:
```typescript
interface AppError {
  code: string;        // e.g., "BIN_NOT_FOUND"
  message: string;     // User-friendly message
  details?: any;       // Additional context
  httpStatus: number;  // HTTP status code
}
```

### Authentication
- JWT-based authentication
- Tokens expire after 24 hours
- Refresh token rotation
- Role-based access control (RBAC)

## Development Guidelines

### Code Organization
```
app/
├── api/           # API routes (Next.js App Router)
├── services/      # Business logic
├── models/        # Data models
├── utils/         # Shared utilities
├── types/         # TypeScript types
├── components/    # React components
├── lib/          # Shared libraries and configurations
└── (routes)/     # Page routes and layouts

prisma/           # Database schema and migrations
public/          # Static assets
docs/            # Documentation
```

### Testing Requirements
- Unit tests for all services
- Integration tests for API endpoints
- E2E tests for critical user journeys
- Minimum 80% code coverage

### Documentation Requirements
- OpenAPI/Swagger documentation for all endpoints
- JSDoc comments for all public functions
- README files for each major component
- Architecture decision records (ADRs) for major decisions

## Getting Started
For new developers working on a component:
1. Review the relevant phase documentation
2. Check dependencies and requirements
3. Set up local development environment
4. Run existing tests
5. Create feature branch following git-flow

## Deployment Strategy
- Staging environment for testing
- Production deployment through CI/CD
- Feature flags for gradual rollout
- Automated rollback capabilities

[More sections to be added as needed...] 