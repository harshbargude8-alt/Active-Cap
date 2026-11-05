import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { PROJECT_CATEGORIES } from '../constants/project';

const CategoriesContext = createContext(null);

export const CategoriesProvider = ({ children }) => {
  const { apiFetch, user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [allCategoriesWithDeleted, setAllCategoriesWithDeleted] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const fetchCategories = useCallback(async (includeDeleted = true) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/categories?includeDeleted=${includeDeleted}`);
      if (res.ok) {
        const data = await res.json();
        setAllCategoriesWithDeleted(data);
        setCategories(data.filter((c) => !c.isDeleted));
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, user]);

  useEffect(() => {
    if (user) {
      fetchCategories();
    } else {
      setCategories([]);
      setAllCategoriesWithDeleted([]);
    }
  }, [user, fetchCategories]);

  const createCategory = async ({ name, color }) => {
    const res = await apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create category');
    }
    await fetchCategories();
    return data;
  };

  const updateCategory = async (id, { name, color }) => {
    const res = await apiFetch(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, color }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update category');
    }
    await fetchCategories();
    // Dispatch event so any project lists re-fetch if tracks were migrated
    window.dispatchEvent(new CustomEvent('project-checkin-logged'));
    return data;
  };

  const softDeleteCategory = async (id) => {
    const res = await apiFetch(`/categories/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to soft delete category');
    }
    await fetchCategories();
    return data;
  };

  const restoreCategory = async (id) => {
    const res = await apiFetch(`/categories/${id}/restore`, {
      method: 'PATCH',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to restore category');
    }
    await fetchCategories();
    return data;
  };

  // Derive an array of category names for easy dropdown consumption
  // Fall back to PROJECT_CATEGORIES if empty or still loading
  const categoryNames = categories.length > 0
    ? categories.map((c) => c.name)
    : PROJECT_CATEGORIES;

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        allCategoriesWithDeleted,
        categoryNames,
        loading,
        fetchCategories,
        createCategory,
        updateCategory,
        softDeleteCategory,
        restoreCategory,
        isManageModalOpen,
        openManageModal: () => setIsManageModalOpen(true),
        closeManageModal: () => setIsManageModalOpen(false),
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoriesContext);
  if (!context) {
    // Return graceful fallback if used outside provider
    return {
      categories: [],
      allCategoriesWithDeleted: [],
      categoryNames: PROJECT_CATEGORIES,
      loading: false,
      fetchCategories: () => {},
      createCategory: async () => {},
      updateCategory: async () => {},
      softDeleteCategory: async () => {},
      restoreCategory: async () => {},
      isManageModalOpen: false,
      openManageModal: () => {},
      closeManageModal: () => {},
    };
  }
  return context;
};

export default CategoriesContext;

