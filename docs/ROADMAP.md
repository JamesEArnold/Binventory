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

#### Phase 1.2: QR Code System
**Context**: Handles generation and management of QR codes for bins
- Implementation Priority: High
- Dependencies: Phase 1.1
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

#### Phase 2.1: Search Infrastructure
**Context**: Enables fast and accurate item discovery
- Implementation Priority: High
- Dependencies: Phase 1.1
- Technical Requirements:
  - MeiliSearch
  - Search indexing service
  - API integration

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

#### Phase 3.1: Core Web Interface
**Context**: Primary user interface for desktop and mobile web browsers
- Implementation Priority: High
- Dependencies: Phase 1.1, Phase 1.2
- Technical Requirements:
  - Next.js
  - TailwindCSS
  - React Query
  - Responsive design system

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

2. Component Interfaces:
```typescript
interface BinCardProps {
  bin: Bin;
  items?: BinItem[];
  onEdit?: (bin: Bin) => void;
  onDelete?: (binId: string) => void;
  onScan?: (binId: string) => void;
  className?: string;
  compact?: boolean;
}

interface ItemDetailProps {
  item: Item;
  bins?: BinItem[];
  onQuantityChange?: (quantity: number) => void;
  onMove?: (fromBinId: string, toBinId: string) => void;
  onEdit?: (item: Item) => void;
  className?: string;
}

// ... more component interfaces
```

3. State Management:
```typescript
interface AppState {
  auth: {
    user?: User;
    token?: string;
    loading: boolean;
  };
  inventory: {
    bins: Record<string, Bin>;
    items: Record<string, Item>;
    categories: Record<string, Category>;
    loading: Record<string, boolean>;
    error?: Error;
  };
  ui: {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
    activeModal?: string;
    notifications: Notification[];
  }
}

// State update patterns
interface StateUpdaters {
  setBin: (bin: Bin) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  moveItem: (itemId: string, fromBin: string, toBin: string) => void;
  // ... more updaters
}
```

#### Phase 3.2: Mobile Scanner Interface
**Context**: Mobile-optimized interface for QR code scanning and quick actions
- Implementation Priority: High
- Dependencies: Phase 3.1
- Technical Requirements:
  - PWA configuration
  - Camera API integration
  - Offline capabilities
  - Touch-optimized UI

**Implementation Tasks**:
1. Implement scanner features:
   - QR code scanning
   - Quick add/remove items
   - Offline queue system
   - Haptic feedback

2. Create mobile-specific views:
   - Scanner interface
   - Quick action menus
   - Mobile-optimized forms
   - Gesture controls

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