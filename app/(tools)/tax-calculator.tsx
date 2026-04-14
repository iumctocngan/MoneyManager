import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SoftColors, shadow } from '@/constants/design';
import { SoftBackdrop, SoftCard, softInputStyles } from '@/components/ui/soft';
import { formatCurrency, formatNumber } from '@/utils';
import { calculatePersonalTax } from '@/services/tax.service';

export default function TaxCalculatorScreen() {

  const [grossInput, setGrossInput] = useState('');
  const [dependentsInput, setDependentsInput] = useState('0');

  const {
    inputIncome,
    personalDeduction,
    dependentDeduction,
    taxableIncome,
    taxAmount,
    netIncome,
    bracketText,
  } = useMemo(() => {
    const incomeVal = parseInt(grossInput.replace(/[^0-9]/g, ''), 10) || 0;
    const depsVal = parseInt(dependentsInput.replace(/[^0-9]/g, ''), 10) || 0;
    return calculatePersonalTax(incomeVal, depsVal);
  }, [grossInput, dependentsInput]);

  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.82} onPress={() => router.back()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={22} color={SoftColors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Thuế TNCN (Hệ NET)</Text>
            <Text style={styles.headerSub}>Tính dựa trên mức lương NET (Theo tháng)</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Inputs */}
          <View style={styles.inputSection}>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Tổng thu nhập (NET) *</Text>
              <View style={softInputStyles.inputShell}>
                <View style={softInputStyles.inputIcon}>
                  <Ionicons name="cash-outline" size={18} color={SoftColors.muted} />
                </View>
                <TextInput
                  value={grossInput ? formatNumber(parseInt(grossInput.replace(/[^0-9]/g, ''), 10)) : ''}
                  onChangeText={setGrossInput}
                  placeholder="Ví dụ: 30,000,000"
                  placeholderTextColor={SoftColors.muted}
                  keyboardType="numeric"
                  style={styles.input}
                  selectionColor={SoftColors.primaryDark}
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Số lượng người phụ thuộc *</Text>
              <View style={softInputStyles.inputShell}>
                <View style={softInputStyles.inputIcon}>
                  <Ionicons name="people-outline" size={18} color={SoftColors.muted} />
                </View>
                <TextInput
                  value={dependentsInput}
                  onChangeText={setDependentsInput}
                  placeholder="0"
                  placeholderTextColor={SoftColors.muted}
                  keyboardType="numeric"
                  style={styles.input}
                  selectionColor={SoftColors.primaryDark}
                />
              </View>
            </View>
          </View>

          {/* Result Card */}
          {inputIncome > 0 && (
            <SoftCard style={styles.resultCard}>
              <Text style={styles.resultHeading}>Thu nhập sau thuế</Text>
              <Text style={styles.netAmount}>{formatCurrency(netIncome)}</Text>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tổng thu nhập (NET)</Text>
                <Text style={[styles.detailValue, { color: SoftColors.text }]}>
                  {formatCurrency(inputIncome)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Giảm trừ bản thân (1 x 15.5tr)</Text>
                <Text style={styles.detailValue}>
                  - {formatCurrency(personalDeduction)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Giảm trừ NPT ({dependentsInput || '0'} x 6.2tr)</Text>
                <Text style={styles.detailValue}>
                  - {formatCurrency(dependentDeduction)}
                </Text>
              </View>

              <View style={[styles.detailRow, { marginTop: 8 }]}>
                <Text style={styles.detailLabelBold}>Tổng thu nhập tính thuế</Text>
                <Text style={styles.detailValueBold}>
                  {formatCurrency(taxableIncome)}
                </Text>
              </View>

              <View style={[styles.detailRow, { alignItems: 'flex-start', marginTop: 4 }]}>
                <Text style={[styles.detailLabelBold, { marginTop: 2 }]}>Số thuế TNCN cần nộp</Text>
                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text style={[styles.detailValueBold, { color: '#FF6B78' }]}>
                    - {formatCurrency(taxAmount)}
                  </Text>
                  {taxAmount > 0 && bracketText !== '' && (
                    <Text style={{ fontSize: 11, color: SoftColors.muted, marginTop: 4, textAlign: 'right' }}>
                      ({bracketText})
                    </Text>
                  )}
                </View>
              </View>
            </SoftCard>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SoftColors.pageBase,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginTop: 10,
    marginBottom: 18,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: SoftColors.text,
  },
  headerSub: {
    fontSize: 12,
    color: SoftColors.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  inputSection: {
    marginBottom: 20,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: SoftColors.text,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    color: SoftColors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  resultCard: {
    padding: 20,
    ...shadow.glow,
  },
  resultHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: SoftColors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  netAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: SoftColors.primaryDark,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(174, 213, 188, 0.3)',
    marginVertical: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: SoftColors.text,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: SoftColors.text,
  },
  detailLabelBold: {
    fontSize: 14,
    fontWeight: '800',
    color: SoftColors.text,
  },
  detailValueBold: {
    fontSize: 15,
    fontWeight: '900',
    color: SoftColors.text,
  },
});
