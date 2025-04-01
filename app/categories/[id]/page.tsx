'use client';

/**
 * @description Category details page implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  path: string[];
  parent: {
    id: string;
    name: string;
  } | null;
  children: Array<{
    id: string;
    name: string;
  }>;
  _count: {
    items: number;
  };
}

interface EditableField {
  name: keyof Category | 'parent_id';
  value: string | undefined;
  type: 'text' | 'select';
  options?: { value: string; label: string }[];
}

export default function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [category, setCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingField, setEditingField] = useState<EditableField['name'] | null>(null);
  const [editValue, setEditValue] = useState<EditableField['value']>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  
  const router = useRouter();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch category
        const categoryResponse = await fetch(`/api/categories/${id}`);
        if (!categoryResponse.ok) {
          throw new Error('Failed to fetch category');
        }
        const categoryData = await categoryResponse.json();
        setCategory(categoryData.data);
        
        // Fetch categories for the parent dropdown
        const categoriesResponse = await fetch('/api/categories');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          // Filter out the current category and its children to prevent circular references
          const filteredCategories = categoriesData.data.filter((cat: Category) => 
            cat.id !== id && !cat.path?.includes(id)
          );
          setCategories(filteredCategories || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load category details. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete category');
      }
      
      router.push('/categories');
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      setIsDeleting(false);
    }
  };

  const startEditing = (field: EditableField['name'], currentValue: EditableField['value']) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue(undefined);
  };

  const handleEditChange = (value: EditableField['value']) => {
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!category || editingField === null) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [editingField === 'parent_id' ? 'parent_id' : editingField]: editValue
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update category');
      }

      // Fetch the complete category data after update
      const refreshResponse = await fetch(`/api/categories/${category.id}`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh category data');
      }
      const refreshData = await refreshResponse.json();
      setCategory(refreshData.data);
      
      setEditingField(null);
      setEditValue(undefined);
    } catch (err) {
      console.error('Error updating category:', err);
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditableField = (field: EditableField) => {
    const isEditing = editingField === field.name;
    
    if (isEditing) {
      return (
        <div className="flex items-center space-x-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
          {field.type === 'select' ? (
            <select
              value={editValue}
              onChange={(e) => handleEditChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
              autoFocus
            >
              <option value="">-- No Parent --</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              value={editValue}
              onChange={(e) => handleEditChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
              autoFocus
            />
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={saveEdit}
              disabled={isSaving}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </>
              )}
            </button>
            <button
              onClick={cancelEditing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="group relative p-2 -m-2 rounded-md hover:bg-gray-50 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {field.type === 'select' && field.name === 'parent_id' ? (
            category?.parent ? (
              <Link href={`/categories/${category.parent.id}`} className="text-purple-600 hover:text-purple-800">
                {category.parent.name}
              </Link>
            ) : (
              <span className="text-gray-500 italic">No parent category</span>
            )
          ) : (
            <span className={field.value ? 'text-gray-900' : 'text-gray-500 italic'}>
              {field.value || 'Not set'}
            </span>
          )}
        </div>
        <button
          onClick={() => startEditing(field.name, field.value)}
          className="ml-2 text-gray-400 hover:text-purple-600 focus:outline-none focus:text-purple-600 transition-colors duration-200"
          title="Edit"
        >
          <div className="flex items-center">
            <span className="text-sm mr-1 font-medium text-gray-500 group-hover:text-purple-600">Edit</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </button>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center bg-white">
        <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 bg-white">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!category) {
    return (
      <div className="container mx-auto px-4 py-8 bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Category not found</h2>
          <p className="mt-1 text-sm text-gray-500">The category you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <div className="mt-6">
            <Link
              href="/categories"
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              ← Back to Categories
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 bg-white">
      <div className="mb-6">
        <Link href="/categories" className="text-purple-600 hover:text-purple-800 flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Categories
        </Link>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
          <button
            onClick={handleDelete}
            disabled={isDeleting || category._count.items > 0 || category.children.length > 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Category Details</h3>
            <p className="mt-1 text-sm text-gray-500">Hover over a field to edit it.</p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {renderEditableField({
                    name: 'name',
                    value: category.name,
                    type: 'text'
                  })}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Parent Category</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {renderEditableField({
                    name: 'parent_id',
                    value: category.parentId || '',
                    type: 'select',
                    options: categories.map(cat => ({
                      value: cat.id,
                      label: cat.name
                    }))
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        
        {category.children.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Child Categories</h3>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
              <ul className="divide-y divide-gray-200">
                {category.children.map((child) => (
                  <li key={child.id} className="px-4 py-4 sm:px-6">
                    <Link
                      href={`/categories/${child.id}`}
                      className="flex items-center justify-between hover:bg-gray-50"
                    >
                      <span className="text-purple-600 hover:text-purple-800 font-medium">
                        {child.name}
                      </span>
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {category._count.items > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Items in this Category</h3>
            <Link
              href={`/items?category=${category.id}`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              View {category._count.items} Items
              <svg className="ml-2 -mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 