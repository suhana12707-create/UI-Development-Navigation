import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Trash2,
  X,
  FolderKanban,
} from 'lucide-react-native';
import { supabase, type Category } from '@/lib/supabase';

const COLOR_OPTIONS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#84CC16',
];

const ICON_OPTIONS = [
  'circle',
  'user',
  'briefcase',
  'shopping-cart',
  'heart-pulse',
  'book-open',
  'home',
  'car',
  'plane',
  'dumbbell',
  'graduation-cap',
  'music',
  'code',
  'camera',
  'coffee',
  'pencil',
];

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [catRes, countRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('todos').select('category_id'),
      ]);

      if (catRes.error) throw catRes.error;
      if (countRes.error) throw countRes.error;

      setCategories(catRes.data as Category[]);

      const countMap: Record<string, number> = {};
      (countRes.data as { category_id: string | null }[]).forEach((row) => {
        if (row.category_id) {
          countMap[row.category_id] = (countMap[row.category_id] ?? 0) + 1;
        }
      });
      setCounts(countMap);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load categories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const addCategory = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert({
          name: trimmed,
          color: selectedColor,
          icon: 'circle',
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      setCategories((prev) => [...prev, data as Category].sort((a, b) =>
        a.name.localeCompare(b.name),
      ));
      setNewName('');
      setSelectedColor(COLOR_OPTIONS[0]);
      setModalVisible(false);
    } catch (err: any) {
      setError(err.message ?? 'Failed to add category');
    } finally {
      setSubmitting(false);
    }
  }, [newName, selectedColor]);

  const deleteCategory = useCallback(async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete category');
      loadData();
    }
  }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <Text style={styles.headerSubtitle}>
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <X size={16} color="#EF4444" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FolderKanban size={64} color="#CBD5E1" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Text style={styles.emptySubtitle}>
              Create categories to organize your tasks
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.categoryCard}>
            <View style={styles.categoryLeft}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: item.color + '20' },
                ]}>
                <View
                  style={[styles.categoryIconDot, { backgroundColor: item.color }]}
                />
              </View>
              <View>
                <Text style={styles.categoryName}>{item.name}</Text>
                <Text style={styles.categoryCount}>
                  {counts[item.id] ?? 0} {(counts[item.id] ?? 0) === 1 ? 'task' : 'tasks'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteCategory(item.id)}
              activeOpacity={0.6}>
              <Trash2 size={18} color="#94A3B8" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}>
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Category</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}>
                <X size={20} color="#64748B" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Category name"
              placeholderTextColor="#94A3B8"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={addCategory}
            />

            <Text style={styles.sectionLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}>
                  {selectedColor === color && (
                    <View style={styles.colorCheck} />
                  )}
                </Pressable>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !newName.trim() && styles.submitButtonDisabled]}
              onPress={addCategory}
              disabled={!newName.trim() || submitting}
              activeOpacity={0.85}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create Category</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 16, default: 24 }),
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  categoryCount: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1E293B',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    transform: [{ scale: 1.1 }],
  },
  colorCheck: {
    width: 14,
    height: 7,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '-45deg' }],
    marginBottom: 3,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
