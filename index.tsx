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
  Check,
  Trash2,
  Flag,
  Calendar,
  X,
  Filter,
  Circle,
  CheckCircle2,
} from 'lucide-react-native';
import { supabase, type TodoWithCategory, type Category, type Priority } from '@/lib/supabase';

const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

type FilterMode = 'all' | 'active' | 'completed';

export default function TasksScreen() {
  const [todos, setTodos] = useState<TodoWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Priority>('medium');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [todosRes, categoriesRes] = await Promise.all([
        supabase
          .from('todos')
          .select('*, categories(id, name, color, icon)')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
      ]);

      if (todosRes.error) throw todosRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setTodos(todosRes.data as TodoWithCategory[]);
      setCategories(categoriesRes.data as Category[]);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load tasks');
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

  const addTodo = useCallback(async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('todos')
        .insert({
          title: trimmed,
          category_id: selectedCategory,
          priority: selectedPriority,
        })
        .select('*, categories(id, name, color, icon)')
        .single();

      if (insertError) throw insertError;

      setTodos((prev) => [data as TodoWithCategory, ...prev]);
      setNewTitle('');
      setSelectedCategory(null);
      setSelectedPriority('medium');
      setModalVisible(false);
    } catch (err: any) {
      setError(err.message ?? 'Failed to add task');
    } finally {
      setSubmitting(false);
    }
  }, [newTitle, selectedCategory, selectedPriority]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)),
    );
    try {
      const { error: updateError } = await supabase
        .from('todos')
        .update({ completed: !completed })
        .eq('id', id);
      if (updateError) throw updateError;
    } catch (err: any) {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed } : t)),
      );
      setError(err.message ?? 'Failed to update task');
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      const { error: deleteError } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete task');
      loadData();
    }
  }, [loadData]);

  const filteredTodos = todos.filter((t) => {
    if (filterMode === 'active' && t.completed) return false;
    if (filterMode === 'completed' && !t.completed) return false;
    if (filterCategory && t.category_id !== filterCategory) return false;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

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
        <View>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <Text style={styles.headerSubtitle}>
            {activeCount} active · {completedCount} done
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.7}>
          <Filter size={18} color="#3B82F6" strokeWidth={2} />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
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
        data={filteredTodos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Circle size={64} color="#CBD5E1" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to add your first task
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.todoCard}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleTodo(item.id, item.completed)}
              activeOpacity={0.7}>
              {item.completed ? (
                <CheckCircle2 size={26} color="#10B981" strokeWidth={2} />
              ) : (
                <Circle size={26} color="#CBD5E1" strokeWidth={2} />
              )}
            </TouchableOpacity>
            <View style={styles.todoContent}>
              <Text
                style={[
                  styles.todoTitle,
                  item.completed && styles.todoTitleCompleted,
                ]}>
                {item.title}
              </Text>
              <View style={styles.todoMeta}>
                {item.categories && (
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: item.categories.color + '20' },
                    ]}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: item.categories.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        { color: item.categories.color },
                      ]}>
                      {item.categories.name}
                    </Text>
                  </View>
                )}
                <View style={styles.priorityBadge}>
                  <Flag
                    size={11}
                    color={PRIORITY_COLORS[item.priority]}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.priorityText,
                      { color: PRIORITY_COLORS[item.priority] },
                    ]}>
                    {PRIORITY_LABELS[item.priority]}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteTodo(item.id)}
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

      {/* Add Task Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Task</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}>
                <X size={20} color="#64748B" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="What needs to be done?"
              placeholderTextColor="#94A3B8"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={addTodo}
            />

            <Text style={styles.sectionLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <Pressable
                  key={p}
                  style={[
                    styles.priorityOption,
                    selectedPriority === p && {
                      backgroundColor: PRIORITY_COLORS[p] + '15',
                      borderColor: PRIORITY_COLORS[p],
                    },
                  ]}
                  onPress={() => setSelectedPriority(p)}>
                  <Flag size={14} color={PRIORITY_COLORS[p]} strokeWidth={2.5} />
                  <Text
                    style={[
                      styles.priorityOptionText,
                      selectedPriority === p && { color: PRIORITY_COLORS[p] },
                    ]}>
                    {PRIORITY_LABELS[p]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categoryChips}>
              <Pressable
                style={[
                  styles.categoryChip,
                  selectedCategory === null && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(null)}>
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === null && styles.categoryChipTextActive,
                  ]}>
                  None
                </Text>
              </Pressable>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.id && {
                      backgroundColor: cat.color + '20',
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() =>
                    setSelectedCategory(
                      selectedCategory === cat.id ? null : cat.id,
                    )
                  }>
                  <View
                    style={[styles.categoryDot, { backgroundColor: cat.color }]}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat.id && { color: cat.color },
                    ]}>
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !newTitle.trim() && styles.submitButtonDisabled]}
              onPress={addTodo}
              disabled={!newTitle.trim() || submitting}
              activeOpacity={0.85}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Add Task</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Tasks</Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalCloseButton}>
                <X size={20} color="#64748B" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.filterRow}>
              {(['all', 'active', 'completed'] as FilterMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  style={[
                    styles.filterOption,
                    filterMode === mode && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilterMode(mode)}>
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterMode === mode && styles.filterOptionTextActive,
                    ]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categoryChips}>
              <Pressable
                style={[
                  styles.categoryChip,
                  filterCategory === null && styles.categoryChipActive,
                ]}
                onPress={() => setFilterCategory(null)}>
                <Text
                  style={[
                    styles.categoryChipText,
                    filterCategory === null && styles.categoryChipTextActive,
                  ]}>
                  All
                </Text>
              </Pressable>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    filterCategory === cat.id && {
                      backgroundColor: cat.color + '20',
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() =>
                    setFilterCategory(
                      filterCategory === cat.id ? null : cat.id,
                    )
                  }>
                  <View
                    style={[styles.categoryDot, { backgroundColor: cat.color }]}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      filterCategory === cat.id && { color: cat.color },
                    ]}>
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => setFilterModalVisible(false)}
              activeOpacity={0.85}>
              <Text style={styles.submitButtonText}>Apply Filter</Text>
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
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
  todoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checkbox: {
    paddingRight: 12,
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 6,
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  marginRight: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 8,
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
    marginBottom: 10,
    marginTop: 4,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  categoryChipActive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#64748B',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  filterOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  filterOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterOptionTextActive: {
    color: '#3B82F6',
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
