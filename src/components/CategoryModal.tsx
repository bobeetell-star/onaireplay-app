import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Folder, Palette } from 'lucide-react';
import { UserWatchlistCategory } from '../types/database';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: UserWatchlistCategory[];
  onCreateCategory: (name: string, color: string) => Promise<boolean>;
  onUpdateCategory: (id: string, name: string, color: string) => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
  loading: boolean;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6B7280', // Gray
];

const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  loading
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<UserWatchlistCategory | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6' });
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({ name: '', color: '#3B82F6' });
    setShowCreateForm(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    let success = false;

    if (editingCategory) {
      success = await onUpdateCategory(editingCategory.id, formData.name, formData.color);
    } else {
      success = await onCreateCategory(formData.name, formData.color);
    }

    if (success) {
      resetForm();
    }
    setSubmitting(false);
  };

  const handleEdit = (category: UserWatchlistCategory) => {
    setFormData({ name: category.name, color: category.color });
    setEditingCategory(category);
    setShowCreateForm(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? Movies in this category will be moved to uncategorized.')) {
      await onDeleteCategory(categoryId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center">
            <Folder className="w-6 h-6 text-blue-400 mr-3" />
            <h2 className="text-xl font-bold text-white">Manage Categories</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Create/Edit Form */}
          {showCreateForm && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-white font-semibold mb-4">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-700 text-white rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                    placeholder="Enter category name"
                    maxLength={50}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Color
                  </label>
                  <div className="flex items-center space-x-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-gray-600"
                      style={{ backgroundColor: formData.color }}
                    />
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-16 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color ? 'border-white scale-110' : 'border-gray-600 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={submitting || !formData.name.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {editingCategory ? 'Update' : 'Create'} Category
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add Category Button */}
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg transition-colors flex items-center justify-center text-gray-400 hover:text-blue-400"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Category
            </button>
          )}

          {/* Categories List */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : categories.length > 0 ? (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-white font-medium">{category.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-gray-400 hover:text-blue-400 transition-colors p-1"
                      title="Edit category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors p-1"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Folder className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No categories created yet</p>
                <p className="text-gray-500 text-sm">Create your first category to organize your watchlist</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;