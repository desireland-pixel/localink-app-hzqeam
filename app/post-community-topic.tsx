
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost, authenticatedPut } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import { CitySearchInput } from '@/components/CitySearchInput';
import { useScreenTracking } from '@/utils/useScreenTracking';
import { SCREEN_NAMES } from '@/utils/analytics';

const GUIDELINES_HIDDEN_KEY = 'community_post_guidelines_hidden';

const CATEGORIES = [
  'General',
  'Education',
  'Finance',
  'Healthcare',
  'Housing',
  'Insurance',
  'Job',
  'Visa',
];

export default function PostCommunityTopicScreen() {
  useScreenTracking(SCREEN_NAMES.COMMUNITY_POST);
  const router = useRouter();
  const params = useLocalSearchParams();
  const [category, setCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Germany');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guidelinesVisible, setGuidelinesVisible] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(GUIDELINES_HIDDEN_KEY);
        if (stored === 'true') setGuidelinesVisible(false);
      } catch (err) {
        console.log('PostCommunityTopicScreen: Could not load guidelines preference', err);
      }
    })();
  }, []);

  const toggleGuidelines = async () => {
    const next = !guidelinesVisible;
    setGuidelinesVisible(next);
    console.log('PostCommunityTopicScreen: Guidelines toggled', { visible: next });
    try {
      await AsyncStorage.setItem(GUIDELINES_HIDDEN_KEY, next ? 'false' : 'true');
    } catch (err) {
      console.log('PostCommunityTopicScreen: Could not save guidelines preference', err);
    }
  };

  const isEditing = !!params.editId;
  const editId = params.editId as string | undefined;

  console.log('PostCommunityTopicScreen: Rendering', { category, title, location, isEditing, editId });

  // Load existing data for editing
  useEffect(() => {
    if (isEditing && params.editData) {
      try {
        const data = JSON.parse(params.editData as string);
        console.log('PostCommunityTopicScreen: Loading edit data', data);
        
        setCategory(data.category || '');
        setTitle(data.title || '');
        setDescription(data.description || '');
        setLocation(data.location || 'Germany');
      } catch (err) {
        console.error('PostCommunityTopicScreen: Error parsing edit data', err);
        setError('Failed to load topic data');
      }
    }
  }, [isEditing, params.editData]);

  const handleSubmit = async () => {
    console.log('PostCommunityTopicScreen: Submit topic', { category, title, description, location });
    
    if (!category.trim()) {
      setError('Please select a category');
      return;
    }
    
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const postData = {
        category: category.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim(),
      };

      if (isEditing && editId) {
        console.log('PostCommunityTopicScreen: Updating topic with data:', postData);
        await authenticatedPut(`/api/community/topics/${editId}`, postData);
        console.log('PostCommunityTopicScreen: Topic updated successfully');
      } else {
        console.log('PostCommunityTopicScreen: Creating topic with data:', postData);
        await authenticatedPost('/api/community/topics', postData);
        console.log('PostCommunityTopicScreen: Topic created successfully');
      }
      router.back();
    } catch (error: any) {
      console.error('PostCommunityTopicScreen: Error creating topic', error);
      setError(error.message || 'Failed to create discussion topic. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Discussion',
          headerShown: true,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity 
              style={styles.categoryButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={[styles.categoryButtonText, !category && styles.categoryButtonPlaceholder]}>
                {category || 'Select category...'}
              </Text>
            </TouchableOpacity>
            {showCategoryPicker && (
              <View style={styles.categoryPicker}>
                <ScrollView
                  style={styles.categoryPickerScroll}
                  nestedScrollEnabled={true}
                  >
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.categoryOption}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text style={styles.categoryOptionText}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.label}>Location (optional)</Text>
            <Text style={styles.infoText}>You can select a city for city-specific discussion</Text>
            <CitySearchInput
              value={location}
              onChangeText={(city) => {
                console.log('PostCommunityTopicScreen: Location changed to:', city);
                setLocation(city);
              }}
              placeholder="Germany"
            />

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Questions about Blue Card application"
              placeholderTextColor={colors.textLight}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Description</Text>

            {guidelinesVisible ? (
              <View style={styles.guidelinesBox}>
                <View style={styles.guidelinesHeader}>
                  <Text style={styles.guidelinesTitle}>Posting guidelines</Text>
                  <TouchableOpacity onPress={toggleGuidelines} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.guidelinesToggle}>Hide</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.guidelinesRule}>🚫 No job seeking</Text>
                <Text style={styles.guidelinesRule}>🚫 No house seeking → use the Sublet feature</Text>
                <Text style={styles.guidelinesAskAbout}>Ask about:</Text>
                <Text style={styles.guidelinesItem}>💼 Jobs → layoffs, interviews, career</Text>
                <Text style={styles.guidelinesItem}>🏠 Housing → landlord, moving, deposit, contracts</Text>
                <Text style={styles.guidelinesItem}>📄 Visa, Finance, Insurance, Taxes & more</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.guidelinesShowPill} onPress={toggleGuidelines}>
                <Text style={styles.guidelinesShowPillText}>Show posting guidelines</Text>
              </TouchableOpacity>
            )}

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your question or topic in detail..."
              placeholderTextColor={colors.textLight}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? (isEditing ? 'Updating...' : 'Posting...') : (isEditing ? 'Update' : 'Post')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal
          visible={!!error}
          title="Error"
          message={error}
          onClose={() => setError('')}
          type="error"
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: spacing.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
    marginTop: 2,
    fontSize: 10,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  categoryButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonText: {
    ...typography.body,
    color: colors.text,
  },
  categoryButtonPlaceholder: {
    color: colors.textLight,
  },
  categoryPicker: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    maxHeight: 250,
  },
  categoryPickerScroll: {
    maxHeight: 250,
  },
  categoryOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryOptionText: {
    ...typography.body,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  guidelinesBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  guidelinesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  guidelinesTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: '#92400E',
  },
  guidelinesToggle: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  guidelinesRule: {
    ...typography.bodySmall,
    color: '#7C2D12',
    marginBottom: 2,
  },
  guidelinesAskAbout: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: '#92400E',
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  guidelinesItem: {
    ...typography.bodySmall,
    color: '#7C2D12',
    marginBottom: 2,
  },
  guidelinesShowPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  guidelinesShowPillText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
});
