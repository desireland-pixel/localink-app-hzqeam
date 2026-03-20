
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function AboutScreen() {
  const [showImprint, setShowImprint] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        
        {/* ABOUT SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol 
                ios_icon_name="info.circle.fill" 
                android_material_icon_name="info" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.settingText}>Version</Text>
            </View>
            <Text style={styles.settingValue}>1.0.1</Text>
          </View>
        </View>

        {/* LEGAL SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowImprint(!showImprint)}
          >
            <View style={styles.settingLeft}>
              <IconSymbol 
                ios_icon_name="doc.text.fill" 
                android_material_icon_name="description" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.settingText}>Imprint</Text>
            </View>
          </TouchableOpacity>

          {showImprint && (
            <View style={styles.imprintContainer}>
              <Text style={styles.imprintText}>
              {`Angaben gemäß §5 TMG:
              
Parth Vishnukumar Patel
Stömmerstr 26
85055, Ingolstadt
Germany
              
Email: admin@lokalinc.de
              
Responsible for content gemäß §18 Abs. 2 MStV:
Same as above`}
              </Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
  },
  settingValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  imprintContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  imprintText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
