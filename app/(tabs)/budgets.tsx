import { Stack } from 'expo-router';
import { 
  Plus, 
  Target,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  FileText,
  BarChart3
} from 'lucide-react-native';
import { useState } from 'react';
import { BarChart } from '@/components/Charts';
import { getBudgetTemplatesForBusinessType } from '@/constants/budget-templates';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert as RNAlert,
  Modal,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Budget } from '@/types/business';

export default function BudgetsScreen() {
  const { business, transactions, budgets, addBudget, updateBudget, deleteBudget } = useBusiness();
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [totalBudget, setTotalBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState<{ category: string; budgeted: string }[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showBudgetDetail, setShowBudgetDetail] = useState(false);

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const getBudgetPerformance = (budget: Budget) => {
    const now = new Date();
    const start = new Date(budget.startDate);
    const end = new Date(budget.endDate);
    
    if (now < start) return { status: 'upcoming', spent: 0, percentage: 0 };
    if (now > end) {
      // Calculate total spent in period
      const periodTransactions = transactions.filter(t => 
        t.date >= budget.startDate && t.date <= budget.endDate && t.type === 'expense'
      );
      const spent = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
      const percentage = budget.totalBudget > 0 ? (spent / budget.totalBudget) * 100 : 0;
      return { 
        status: percentage <= 100 ? 'completed' : 'over', 
        spent, 
        percentage 
      };
    }

    // Active budget - calculate spent so far
    const periodTransactions = transactions.filter(t => 
      t.date >= budget.startDate && t.date <= now.toISOString().split('T')[0] && t.type === 'expense'
    );
    const spent = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
    const percentage = budget.totalBudget > 0 ? (spent / budget.totalBudget) * 100 : 0;
    
    return { status: 'active', spent, percentage };
  };

  const handleSave = async () => {
    if (!name || !totalBudget || !startDate || !endDate) {
      RNAlert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    const budgetAmount = parseFloat(totalBudget);
    if (budgetAmount <= 0) {
      RNAlert.alert('Invalid Amount', 'Budget amount must be greater than 0');
      return;
    }

    const categoryBudgets = categories
      .filter(c => c.category && c.budgeted)
      .map(c => ({ category: c.category, budgeted: parseFloat(c.budgeted) || 0 }));

    try {
      if (editingId) {
        await updateBudget(editingId, {
          name,
          period,
          categories: categoryBudgets,
          totalBudget: budgetAmount,
          startDate,
          endDate,
          currency: business?.currency || 'USD',
        });
      } else {
        await addBudget({
          name,
          period,
          categories: categoryBudgets,
          totalBudget: budgetAmount,
          startDate,
          endDate,
          currency: business?.currency || 'USD',
        });
      }

      handleCloseModal();
      RNAlert.alert('Success', editingId ? 'Budget updated' : 'Budget created');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save budget');
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setName(budget.name);
    setPeriod(budget.period);
    setTotalBudget(budget.totalBudget.toString());
    setStartDate(budget.startDate);
    setEndDate(budget.endDate);
    setCategories(
      budget.categories.length > 0
        ? budget.categories.map(c => ({ category: c.category, budgeted: c.budgeted.toString() }))
        : [{ category: '', budgeted: '' }]
    );
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      'Delete Budget',
      'Are you sure you want to delete this budget?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudget(id);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete budget');
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setName('');
    setPeriod('monthly');
    setTotalBudget('');
    setStartDate('');
    setEndDate('');
    setCategories([]);
  };

  const addCategory = () => {
    setCategories([...categories, { category: '', budgeted: '' }]);
  };

  const updateCategory = (index: number, field: string, value: string) => {
    const newCategories = [...categories];
    newCategories[index] = { ...newCategories[index], [field]: value };
    setCategories(newCategories);
  };

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Budgets', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Budgets</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.templateButton, { backgroundColor: theme.background.secondary }]}
            onPress={() => setShowTemplateModal(true)}
          >
            <FileText size={18} color={theme.accent.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
            onPress={() => {
              const today = new Date();
              const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
              const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              setStartDate(monthStart.toISOString().split('T')[0]);
              setEndDate(monthEnd.toISOString().split('T')[0]);
              setCategories([{ category: '', budgeted: '' }]);
              setShowModal(true);
            }}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Target size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              No budgets yet
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyButtonText}>Create Your First Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          budgets.map(budget => {
            const performance = getBudgetPerformance(budget);
            const remaining = budget.totalBudget - performance.spent;
            const isOver = performance.percentage > 100;
            
            return (
              <View
                key={budget.id}
                style={[styles.budgetCard, { backgroundColor: theme.background.card }]}
              >
                <View style={styles.budgetHeader}>
                  <View style={styles.budgetInfo}>
                    <Text style={[styles.budgetName, { color: theme.text.primary }]}>
                      {budget.name}
                    </Text>
                    <Text style={[styles.budgetPeriod, { color: theme.text.tertiary }]}>
                      {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} • {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.budgetActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setSelectedBudget(budget);
                        setShowBudgetDetail(true);
                      }}
                    >
                      <BarChart3 size={18} color={theme.accent.info} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(budget)}
                    >
                      <Edit2 size={18} color={theme.accent.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(budget.id)}
                    >
                      <Trash2 size={18} color={theme.accent.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.budgetProgress}>
                  <View style={styles.progressHeader}>
                    <Text style={[styles.progressLabel, { color: theme.text.secondary }]}>
                      {performance.status === 'upcoming' ? 'Budget' : performance.status === 'active' ? 'Spent' : 'Total Spent'}
                    </Text>
                    <Text style={[styles.progressValue, { color: isOver ? theme.accent.danger : theme.text.primary }]}>
                      {formatCurrency(performance.spent)} / {formatCurrency(budget.totalBudget)}
                    </Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: theme.background.secondary }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(performance.percentage, 100)}%`,
                          backgroundColor: isOver ? theme.accent.danger : performance.percentage > 80 ? theme.accent.warning : theme.accent.primary,
                        }
                      ]}
                    />
                  </View>
                  <View style={styles.progressFooter}>
                    <Text style={[styles.progressPercentage, { color: theme.text.tertiary }]}>
                      {performance.percentage.toFixed(1)}%
                    </Text>
                    {performance.status === 'active' && (
                      <Text style={[styles.remainingText, { color: remaining >= 0 ? '#10B981' : theme.accent.danger }]}>
                        {remaining >= 0 ? 'Remaining: ' : 'Over by: '}{formatCurrency(Math.abs(remaining))}
                      </Text>
                    )}
                  </View>
                </View>

                {isOver && (
                  <View style={[styles.alertBanner, { backgroundColor: theme.surface.danger }]}>
                    <AlertCircle size={16} color={theme.accent.danger} />
                    <Text style={[styles.alertText, { color: theme.accent.danger }]}>
                      Budget exceeded by {formatCurrency(Math.abs(remaining))}
                    </Text>
                  </View>
                )}

                {budget.categories.length > 0 && (
                  <View style={styles.categoriesList}>
                    <Text style={[styles.categoriesTitle, { color: theme.text.secondary }]}>Category Breakdown:</Text>
                    {budget.categories.map((cat, i) => (
                      <View key={i} style={styles.categoryItem}>
                        <Text style={[styles.categoryName, { color: theme.text.primary }]}>{cat.category}</Text>
                        <Text style={[styles.categoryAmount, { color: theme.text.secondary }]}>
                          {formatCurrency(cat.budgeted)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Budget Templates Modal */}
      <Modal visible={showTemplateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Budget Templates</Text>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.templateDescription, { color: theme.text.secondary }]}>
                Select a template to quickly create a budget based on your business type
              </Text>
              {getBudgetTemplatesForBusinessType(business?.type).map(template => (
                <TouchableOpacity
                  key={template.id}
                  style={[styles.templateCard, { backgroundColor: theme.background.secondary }]}
                  onPress={() => {
                    const today = new Date();
                    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    
                    setName(template.name);
                    setStartDate(monthStart.toISOString().split('T')[0]);
                    setEndDate(monthEnd.toISOString().split('T')[0]);
                    setCategories(template.categories.map(cat => ({ category: cat.category, budgeted: '' })));
                    setShowTemplateModal(false);
                    setShowModal(true);
                  }}
                >
                  <Text style={[styles.templateName, { color: theme.text.primary }]}>{template.name}</Text>
                  <Text style={[styles.templateDesc, { color: theme.text.secondary }]}>{template.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Budget Detail Modal */}
      <Modal visible={showBudgetDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {selectedBudget?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowBudgetDetail(false)}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedBudget && (() => {
                const categoryData = selectedBudget.categories.map(cat => {
                  const categorySpent = transactions
                    .filter(t => t.category === cat.category && t.type === 'expense' && 
                      t.date >= selectedBudget.startDate && t.date <= selectedBudget.endDate)
                    .reduce((sum, t) => sum + t.amount, 0);
                  return {
                    category: cat.category,
                    budgeted: cat.budgeted,
                    spent: categorySpent,
                    percentage: cat.budgeted > 0 ? (categorySpent / cat.budgeted) * 100 : 0,
                  };
                });

                return (
                  <>
                    {/* Budget vs Actual Chart */}
                    {categoryData.length > 0 && (
                      <View style={[styles.chartCard, { backgroundColor: theme.background.secondary }]}>
                        <View style={styles.chartHeader}>
                          <BarChart3 size={20} color={theme.accent.primary} />
                          <Text style={[styles.chartTitle, { color: theme.text.primary }]}>Budget vs Actual</Text>
                        </View>
                        <BarChart
                          data={categoryData.map(cat => ({
                            label: cat.category,
                            value: cat.budgeted,
                            color: theme.accent.primary,
                          }))}
                          height={200}
                        />
                      </View>
                    )}

                    {/* Category Breakdown */}
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Category Breakdown</Text>
                      {categoryData.map((cat, i) => (
                        <View key={i} style={[styles.categoryDetailItem, { backgroundColor: theme.background.secondary }]}>
                          <View style={styles.categoryDetailHeader}>
                            <Text style={[styles.categoryDetailName, { color: theme.text.primary }]}>
                              {cat.category}
                            </Text>
                            <Text style={[styles.categoryDetailAmount, { color: cat.spent > cat.budgeted ? theme.accent.danger : theme.text.primary }]}>
                              {formatCurrency(cat.spent)} / {formatCurrency(cat.budgeted)}
                            </Text>
                          </View>
                          <View style={[styles.categoryProgressBar, { backgroundColor: theme.background.card }]}>
                            <View
                              style={[styles.categoryProgressFill, {
                                width: `${Math.min(cat.percentage, 100)}%`,
                                backgroundColor: cat.spent > cat.budgeted ? theme.accent.danger : cat.percentage > 80 ? theme.accent.warning : theme.accent.success,
                              }]}
                            />
                          </View>
                          <Text style={[styles.categoryPercentage, { color: theme.text.tertiary }]}>
                            {cat.percentage.toFixed(1)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingId ? 'Edit Budget' : 'Create Budget'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Budget Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Monthly Operating Budget"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Period *</Text>
                <View style={styles.periodOptions}>
                  {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.periodOption,
                        {
                          backgroundColor: period === p ? theme.accent.primary : theme.background.secondary,
                        }
                      ]}
                      onPress={() => setPeriod(p)}
                    >
                      <Text style={[
                        styles.periodOptionText,
                        { color: period === p ? '#fff' : theme.text.primary }
                      ]}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Start Date *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>End Date *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Total Budget *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={totalBudget}
                  onChangeText={setTotalBudget}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.categoriesHeader}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Category Budgets (Optional)</Text>
                  <TouchableOpacity
                    style={[styles.addCategoryButton, { backgroundColor: theme.accent.primary }]}
                    onPress={addCategory}
                  >
                    <Plus size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
                {categories.map((cat, index) => (
                  <View key={index} style={styles.categoryInputRow}>
                    <TextInput
                      style={[styles.categoryInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={cat.category}
                      onChangeText={(value) => updateCategory(index, 'category', value)}
                      placeholder="Category"
                      placeholderTextColor={theme.text.tertiary}
                    />
                    <TextInput
                      style={[styles.budgetInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={cat.budgeted}
                      onChangeText={(value) => updateCategory(index, 'budgeted', value)}
                      placeholder="Amount"
                      placeholderTextColor={theme.text.tertiary}
                      keyboardType="decimal-pad"
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeCategory(index)}
                    >
                      <X size={18} color={theme.accent.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.buttonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  budgetCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetPeriod: {
    fontSize: 12,
  },
  budgetActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  budgetProgress: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 12,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    gap: 6,
    marginTop: 8,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoriesList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  categoriesTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
  },
  categoryAmount: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  periodOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  periodOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCategoryButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  categoryInput: {
    flex: 2,
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  budgetInput: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    // Styled via backgroundColor
  },
  saveButton: {
    // Styled via backgroundColor
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  templateDescription: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  templateCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  templateDesc: {
    fontSize: 14,
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  categoryDetailItem: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  categoryDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryDetailName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  categoryDetailAmount: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  categoryProgressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
  },
});

