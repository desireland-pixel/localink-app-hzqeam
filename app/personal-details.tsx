
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPatch } from '@/utils/api';
import Modal from '@/components/ui/Modal';

export default function PersonalDetailsScreen() {
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setName(user.name || '');
    }
    if (profile) {
      setCity(profile.city || '');
    }
  }, [user, profile]);

  const handleSave = async () => {
    console.log('PersonalDetailsScreen: Saving personal details');
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authenticatedPatch('/api/profile', {
        name: name.trim(),
        city: city.trim(),
      });
      setSuccess('Personal details updated successfully');
    } catch (err: any) {
      console.error('PersonalDetailsScreen: Error updating details', err);
      setError(err.message || 'Failed to update personal details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Personal Details</Text>
        <Text style={styles.subtitle}>Manage your account information</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textLight}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          placeholder="Email address"
          placeholderTextColor={colors.textLight}
          value={email}
          editable={false}
        />
        <Text style={styles.helperText}>Email cannot be changed</Text>

        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your city"
          placeholderTextColor={colors.textLight}
          value={city}
          onChangeText={setCity}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={!!error}
        title="Error"
        message={error}
        onClose={() => setError('')}
        type="error"
      />

      <Modal
        visible={!!success}
        title="Success"
        message={success}
        onClose={() => setSuccess('')}
        type="success"
      />
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
    paddingTop: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
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
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: colors.border,
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginTop: spacing.xs,
    fontStyle: 'italic',
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
