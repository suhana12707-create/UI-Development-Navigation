import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  Circle,
  TrendingUp,
  FolderKanban,
  Calendar,
  Award,
} from 'lucide-react-native';
import { supabase, type Category, type Todo } from '@/lib/supabase';

export default function StatsScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [todosRes, catRes] = await Promise.all([
        supabase.from('todos').select('*'),
        supabase.from('categories').select('*').order('name'),
      ]);

      if (todosRes.error) throw todosRes.error;
      if (catRes.error) throw catRes.error;

      setTodos(todosRes.data as Todo[]);
      setCategories(catRes.data as Category[]);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load stats');
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

  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const active = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const priorityStats = {
    high: todos.filter((t) => t.priority === 'high').length,
    medium: todos.filter((t) => t.priority === 'medium').length,
    low: todos.filter((t) => t.priority === 'low').length,
  };

  const categoryStats = categories.map((cat) => {
    const catTodos = todos.filter((t) => t.category_id === cat.id);
    const catCompleted = catTodos.filter((t) => t.completed).length;
    return {
      ...cat,
      total: catTodos.length,
      completed: catCompleted,
      rate: catTodos.length > 0 ? Math.round((catCompleted / catTodos.length) * 100) : 0,
    };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueToday = todos.filter((t) => {
    if (!t.due_date || t.completed) return false;
    const due = new Date(t.due_date);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime();
  }).length;

  const overdue = todos.filter((t) => {
    if (!t.due_date || t.completed) return false;
    const due = new Date(t.due_date);
    due.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
  }).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Statistics</Text>
          <Text style={styles.headerSubtitle}>Your productivity overview</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Completion Ring */}
        <View style={styles.progressCard}>
          <View style={styles.progressRingContainer}>
            <View style={styles.progressRing}>
              <Text style={styles.progressPercent}>{completionRate}%</Text>
              <Text style={styles.progressLabel}>Complete</Text>
            </View>
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressStatRow}>
              <CheckCircle2 size={18} color="#10B981" strokeWidth={2} />
              <Text style={styles.progressStatText}>{completed} Completed</Text>
            </View>
            <View style={styles.progressStatRow}>
              <Circle size={18} color="#F59E0B" strokeWidth={2} />
              <Text style={styles.progressStatText}>{active} Active</Text>
            </View>
            <View style={styles.progressStatRow}>
              <TrendingUp size={18} color="#3B82F6" strokeWidth={2} />
              <Text style={styles.progressStatText}>{total} Total</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#FEF2F2' }]}>
              <Calendar size={20} color="#EF4444" strokeWidth={2} />
            </View>
            <Text style={styles.quickStatNumber}>{dueToday}</Text>
            <Text style={styles.quickStatLabel}>Due Today</Text>
          </View>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#FEF3C7' }]}>
              <Award size={20} color="#F59E0B" strokeWidth={2} />
            </View>
            <Text style={styles.quickStatNumber}>{overdue}</Text>
            <Text style={styles.quickStatLabel}>Overdue</Text>
          </View>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#EFF6FF' }]}>
              <FolderKanban size={20} color="#3B82F6" strokeWidth={2} />
            </View>
            <Text style={styles.quickStatNumber}>{categories.length}</Text>
            <Text style={styles.quickStatLabel}>Categories</Text>
          </View>
        </View>

        {/* Priority Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>By Priority</Text>
          <View style={styles.priorityBarContainer}>
            <PriorityBar label="High" count={priorityStats.high} total={total} color="#EF4444" />
            <PriorityBar label="Medium" count={priorityStats.medium} total={total} color="#F59E0B" />
            <PriorityBar label="Low" count={priorityStats.low} total={total} color="#10B981" />
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>By Category</Text>
          {categoryStats.length === 0 ? (
            <Text style={styles.emptySectionText}>No categories yet</Text>
          ) : (
            categoryStats.map((cat) => (
              <View key={cat.id} style={styles.categoryStatRow}>
                <View style={styles.categoryStatHeader}>
                  <View style={styles.categoryStatLeft}>
                    <View
                      style={[styles.categoryStatDot, { backgroundColor: cat.color }]}
                    />
                    <Text style={styles.categoryStatName}>{cat.name}</Text>
                  </View>
                  <Text style={styles.categoryStatCount}>
                    {cat.completed}/{cat.total}
                  </Text>
                </View>
                <View style={styles.categoryBarBg}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: `${cat.rate}%`,
                        backgroundColor: cat.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PriorityBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={styles.priorityBarRow}>
      <View style={styles.priorityBarLabel}>
        <View style={[styles.priorityBarDot, { backgroundColor: color }]} />
        <Text style={styles.priorityBarText}>{label}</Text>
      </View>
      <View style={styles.priorityBarTrack}>
        <View
          style={[
            styles.priorityBarProgress,
            { width: `${percent}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.priorityBarCount}>{count}</Text>
    </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: Platform.select({ ios: 16, default: 24 }),
  },
  header: {
    marginBottom: 20,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressRingContainer: {
    marginRight: 24,
  },
  progressRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 8,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  progressPercent: {
    fontSize: 26,
    fontWeight: '700',
    color: '#3B82F6',
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  progressStats: {
    flex: 1,
    gap: 12,
  },
  progressStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressStatText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  priorityBarContainer: {
    gap: 14,
  },
  priorityBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 80,
  },
  priorityBarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityBarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  priorityBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  priorityBarProgress: {
    height: '100%',
    borderRadius: 4,
  },
  priorityBarCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    width: 28,
    textAlign: 'right',
  },
  categoryStatRow: {
    marginBottom: 16,
  },
  categoryStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryStatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryStatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryStatName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  categoryStatCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
