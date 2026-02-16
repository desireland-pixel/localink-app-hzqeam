
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost, authenticatedPut } from '@/utils/api';
import Modal from '@/components/ui/Modal';

const CATEGORIES = [
  'Visa',
  'Travel Insurance',
  'Housing',
  'Jobs',
  'Healthcare',
  'Banking',
  'Education',
  'General',
];

export default function PostCommunityTopicScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [category, setCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!params.editId;
  const editId = params.editId as string | undefined;

  console.log('PostCommunityTopicScreen: Rendering', { category, title, isEditing, editId });

  // Load existing data for editing
  useEffect(() => {
    if (isEditing && params.editData) {
      try {
        const data = JSON.parse(params.editData as string);
        console.log('PostCommunityTopicScreen: Loading edit data', data);
        
        setCategory(data.category || '');
        setTitle(data.title || '');
        setDescription(data.description || '');
      } catch (err) {
        console.error('PostCommunityTopicScreen: Error parsing edit data', err);
        setError('Failed to load topic data');
      }
    }
  }, [isEditing, params.editData]);

  const handleSubmit = async () => {
    console.log('PostCommunityTopicScreen: Submit topic', { category, title, description });
    
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>{isEditing ? 'Edit Discussion' : 'Start a Discussion'}</Text>

          <Text style={styles.label}>Category *</Text>
          <TouchableOpacity 
            style={styles.categoryButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            disabled={isEditing}
          >
            <Text style={[styles.categoryButtonText, !category && styles.categoryButtonPlaceholder]}>
              {category || 'Select category...'}
            </Text>
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.categoryPicker}>
              <ScrollView style={styles.categoryPickerScroll}>
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

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Questions about Blue Card application"
            placeholderTextColor={colors.textLight}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description</Text>
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
              {loading ? (isEditing ? 'Updating...' : 'Posting...') : (isEditing ? 'Update Discussion' : 'Post Discussion')}
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
  pageTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
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
    paddingVertical: spacing.md,
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
});
