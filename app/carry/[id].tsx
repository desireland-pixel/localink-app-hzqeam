
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';

interface CarryPost {
  id: string;
  userId: string;
  title: string;
  description?: string;
  fromCity: string;
  toCity: string;
  travelDate?: string;
  type: 'request' | 'traveler';
  itemDescription?: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export default function CarryDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [carryPost, setCarryPost] = useState<CarryPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('CarryDetailsScreen: Viewing carry item', { id });

  useEffect(() => {
    fetchCarryPost();
  }, [id]);

  const fetchCarryPost = async () => {
    try {
      console.log('[CarryDetails] Fetching carry post:', id);
      const data = await authenticatedGet<CarryPost>(`/api/carry-posts/${id}`);
      console.log('[CarryDetails] Carry post fetched:', data);
      setCarryPost(data);
    } catch (err) {
      console.error('[CarryDetails] Error fetching carry post:', err);
      setError(err instanceof Error ? err.message : 'Failed to load carry post');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async () => {
    if (!carryPost || contacting) return;
    
    console.log('CarryDetailsScreen: Contact user');
    setContacting(true);

    try {
      console.log('[CarryDetails] Creating conversation with:', carryPost.user.id);
      const response = await authenticatedPost<{ conversationId: string; conversation: any }>(
        '/api/conversations',
        {
          postId: id,
          postType: 'carry',
          recipientId: carryPost.user.id,
        }
      );
      console.log('[CarryDetails] Conversation created:', response);
      
      // Navigate to the chat
      router.push(`/chat/${response.conversationId}`);
    } catch (err) {
      console.error('[CarryDetails] Error creating conversation:', err);
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

  const getTypeLabel = (type: string) => {
    return type === 'request' ? 'Request' : 'Traveler';
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

  if (!carryPost) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Carry post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnPost = carryPost.userId === user?.id;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{carryPost.title}</Text>
          
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getTypeLabel(carryPost.type)}</Text>
          </View>

          <View style={styles.routeContainer}>
            <Text style={styles.routeText}>
              {carryPost.fromCity} 📦 {carryPost.toCity}
            </Text>
          </View>

          {carryPost.travelDate && (
            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>Travel Date:</Text>
              <Text style={styles.dateText}>{formatDate(carryPost.travelDate)}</Text>
            </View>
          )}

          {carryPost.itemDescription && (
            <View style={styles.itemContainer}>
              <Text style={styles.itemLabel}>Item:</Text>
              <Text style={styles.itemText}>{carryPost.itemDescription}</Text>
            </View>
          )}

          {carryPost.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description:</Text>
              <Text style={styles.description}>{carryPost.description}</Text>
            </View>
          )}

          <View style={styles.userContainer}>
            <Text style={styles.userLabel}>Posted by:</Text>
            <Text style={styles.userName}>{carryPost.user.name}</Text>
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
              <Text style={styles.contactButtonText}>Contact User</Text>
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
    marginBottom: spacing.md,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  badgeText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  routeContainer: {
    marginBottom: spacing.md,
  },
  routeText: {
    ...typography.h3,
    color: colors.text,
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
  itemContainer: {
    marginBottom: spacing.md,
  },
  itemLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
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
