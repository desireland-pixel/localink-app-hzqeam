
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';

interface Sublet {
  id: string;
  userId: string;
  title: string;
  description?: string;
  city: string;
  availableFrom: string;
  availableTo: string;
  rent?: string;
  imageUrls?: string[];
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export default function SubletDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [sublet, setSublet] = useState<Sublet | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('SubletDetailsScreen: Viewing sublet', { id });

  useEffect(() => {
    fetchSublet();
  }, [id]);

  const fetchSublet = async () => {
    try {
      console.log('[SubletDetails] Fetching sublet:', id);
      const data = await authenticatedGet<Sublet>(`/api/sublets/${id}`);
      console.log('[SubletDetails] Sublet fetched:', data);
      setSublet(data);
    } catch (err) {
      console.error('[SubletDetails] Error fetching sublet:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sublet');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async () => {
    if (!sublet || contacting) return;
    
    console.log('SubletDetailsScreen: Contact owner');
    setContacting(true);

    try {
      console.log('[SubletDetails] Creating conversation with:', sublet.user.id);
      const response = await authenticatedPost<{ conversationId: string; conversation: any }>(
        '/api/conversations',
        {
          postId: id,
          postType: 'sublet',
          recipientId: sublet.user.id,
        }
      );
      console.log('[SubletDetails] Conversation created:', response);
      
      // Navigate to the chat
      router.push(`/chat/${response.conversationId}`);
    } catch (err) {
      console.error('[SubletDetails] Error creating conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setContacting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!sublet) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Sublet not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnPost = sublet.userId === user?.id;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{sublet.title}</Text>
          <Text style={styles.city}>📍 {sublet.city}</Text>
          
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Available:</Text>
            <Text style={styles.dateText}>
              {formatDate(sublet.availableFrom)} - {formatDate(sublet.availableTo)}
            </Text>
          </View>

          {sublet.rent && (
            <Text style={styles.rent}>💰 €{sublet.rent}/month</Text>
          )}

          {sublet.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description:</Text>
              <Text style={styles.description}>{sublet.description}</Text>
            </View>
          )}

          <View style={styles.userContainer}>
            <Text style={styles.userLabel}>Posted by:</Text>
            <Text style={styles.userName}>{sublet.user.name}</Text>
          </View>
        </View>

        {!isOwnPost && (
          <TouchableOpacity 
            style={[styles.contactButton, contacting && styles.contactButtonDisabled]} 
            onPress={handleContact}
            disabled={contacting}
          >
            {contacting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.contactButtonText}>Contact Owner</Text>
            )}
          </TouchableOpacity>
        )}

        {isOwnPost && (
          <View style={styles.ownPostNotice}>
            <Text style={styles.ownPostText}>This is your post</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!error}
        onClose={() => setError(null)}
        title="Error"
        message={error || ''}
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  city: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  dateContainer: {
    marginBottom: spacing.md,
  },
  dateLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateText: {
    ...typography.body,
    color: colors.text,
  },
  rent: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  descriptionContainer: {
    marginBottom: spacing.md,
  },
  descriptionLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  userContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  userName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  contactButtonDisabled: {
    opacity: 0.5,
  },
  contactButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  ownPostNotice: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ownPostText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
