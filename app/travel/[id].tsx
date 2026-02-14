
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import { IconSymbol } from '@/components/IconSymbol';

interface TravelPost {
  id: string;
  shortId?: string;
  userId: string;
  title?: string;
  description?: string;
  fromCity: string;
  toCity: string;
  travelDate: string;
  type: 'seeking' | 'offering' | 'seeking-ally';
  companionshipFor?: string;
  travelDateTo?: string;
  canOfferCompanionship?: boolean;
  canCarryItems?: boolean;
  item?: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username?: string;
  };
}

export default function TravelDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [travelPost, setTravelPost] = useState<TravelPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('TravelDetailsScreen: Viewing travel', { id });

  useEffect(() => {
    fetchTravelPost();
  }, [id]);

  const fetchTravelPost = async () => {
    try {
      console.log('[TravelDetails] Fetching travel post:', id);
      const data = await authenticatedGet<TravelPost>(`/api/travel-posts/${id}`);
      console.log('[TravelDetails] Travel post fetched:', data);
      setTravelPost(data);
    } catch (err) {
      console.error('[TravelDetails] Error fetching travel post:', err);
      setError(err instanceof Error ? err.message : 'Failed to load travel post');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async () => {
    if (!travelPost || contacting) return;
    
    console.log('TravelDetailsScreen: Contact traveler');
    setContacting(true);

    try {
      console.log('[TravelDetails] Creating conversation with:', travelPost.user.id);
      const response = await authenticatedPost<{ conversationId: string; conversation: any }>(
        '/api/conversations',
        {
          postId: id,
          postType: 'travel',
          recipientId: travelPost.user.id,
        }
      );
      console.log('[TravelDetails] Conversation created:', response);
      
      // Navigate to the chat
      router.push(`/chat/${response.conversationId}`);
    } catch (err) {
      console.error('[TravelDetails] Error creating conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setContacting(false);
    }
  };

  const getTypeLabel = (post: TravelPost) => {
    if (post.type === 'offering') {
      const hasCompanionship = post.canOfferCompanionship;
      const hasCarry = post.canCarryItems;
      
      if (hasCompanionship && hasCarry) {
        return `Offering 👥📦 from ${post.fromCity} to ${post.toCity}`;
      } else if (hasCompanionship) {
        return `Offering 👥 from ${post.fromCity} to ${post.toCity}`;
      } else if (hasCarry) {
        return `Offering 📦 from ${post.fromCity} to ${post.toCity}`;
      }
      return `Offering from ${post.fromCity} to ${post.toCity}`;
    } else if (post.type === 'seeking') {
      return `Seeking 👥 from ${post.fromCity} to ${post.toCity}`;
    } else if (post.type === 'seeking-ally') {
      return `Seeking 📦 from ${post.fromCity} to ${post.toCity}`;
    }
    return `${post.fromCity} to ${post.toCity}`;
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

  if (!travelPost) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Travel post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnPost = travelPost.userId === user?.id;
  const title = getTypeLabel(travelPost);
  const travelDateDisplay = formatDateToDDMMYYYY(travelPost.travelDate);
  const travelDateToDisplay = travelPost.travelDateTo ? formatDateToDDMMYYYY(travelPost.travelDateTo) : null;
  const displayId = travelPost.shortId || travelPost.id.substring(0, 8);
  
  // Determine tag label
  let tagLabel = '';
  if (travelPost.type === 'offering') {
    const hasCompanionship = travelPost.canOfferCompanionship;
    const hasCarry = travelPost.canCarryItems;
    
    if (hasCompanionship && hasCarry) {
      tagLabel = 'Offering 👥📦';
    } else if (hasCompanionship) {
      tagLabel = 'Offering 👥';
    } else if (hasCarry) {
      tagLabel = 'Offering 📦';
    } else {
      tagLabel = 'Offering';
    }
  } else if (travelPost.type === 'seeking') {
    tagLabel = 'Seeking 👥';
  } else if (travelPost.type === 'seeking-ally') {
    tagLabel = 'Seeking 📦';
  }

  const handleEdit = () => {
    console.log('TravelDetailsScreen: Edit post', id);
    // TODO: Navigate to edit screen
    router.push(`/edit-travel/${id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            {isOwnPost && (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tagLabel}</Text>
          </View>

          <View style={styles.postIdContainer}>
            <Text style={styles.postIdLabel}>Post ID:</Text>
            <Text style={styles.postIdValue}>{displayId}</Text>
          </View>

          <View style={styles.routeContainer}>
            <Text style={styles.routeText}>
              {travelPost.fromCity} ✈️ {travelPost.toCity}
            </Text>
          </View>

          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Travel Date:</Text>
            <Text style={styles.dateText}>{travelDateDisplay || 'Not specified'}</Text>
          </View>

          {travelDateToDisplay && (
            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>Travel Date To:</Text>
              <Text style={styles.dateText}>{travelDateToDisplay}</Text>
            </View>
          )}

          {travelPost.companionshipFor && (
            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>Companionship For:</Text>
              <Text style={styles.dateText}>{travelPost.companionshipFor}</Text>
            </View>
          )}

          {travelPost.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description:</Text>
              <Text style={styles.description}>{travelPost.description}</Text>
            </View>
          )}

          <View style={styles.userContainer}>
            <Text style={styles.userLabel}>Posted by:</Text>
            <Text style={styles.userName}>{travelPost.user.username || travelPost.user.name}</Text>
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
              <Text style={styles.contactButtonText}>Contact Traveler</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  editButton: {
    padding: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
  postIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  postIdLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  postIdValue: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
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
