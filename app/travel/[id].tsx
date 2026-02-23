
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPatch, authenticatedDelete } from '@/utils/api';
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
  incentiveAmount?: number;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username?: string;
  };
  incentive?: {
    displayText: string;
    disclaimer: string;
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  console.log('TravelDetailsScreen: Viewing travel', { id });

  const fetchTravelPost = React.useCallback(async () => {
    // Only show full loading spinner on initial load
    if (!initialLoadComplete) {
      setLoading(true);
    }
    
    try {
      console.log('[TravelDetails] Fetching travel post:', id);
      const data = await authenticatedGet<TravelPost>(`/api/travel-posts/${id}`);
      console.log('[TravelDetails] Travel post fetched:', data);
      setTravelPost(data);
      
      // Check if favorited
      const favoriteCheck = await authenticatedGet<{ isFavorited: boolean }>(`/api/favorites/check/${id}?postType=travel`);
      setIsFavorited(favoriteCheck.isFavorited);
      
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    } catch (err) {
      console.error('[TravelDetails] Error fetching travel post:', err);
      setError(err instanceof Error ? err.message : 'Failed to load travel post');
    } finally {
      setLoading(false);
    }
  }, [id, initialLoadComplete]);

  useEffect(() => {
    fetchTravelPost();
  }, [fetchTravelPost]);

  const handleContact = async () => {
    if (!travelPost || contacting) return;
    
    console.log('TravelDetailsScreen: Contact traveler');
    setContacting(true);

    try {
      const postId = typeof id === 'string' ? id : String(id);
      const recipientId = travelPost.userId;
      
      console.log('[TravelDetails] Creating conversation with postId:', postId, 'recipientId:', recipientId);
      
      const response = await authenticatedPost<{ id: string; conversationId?: string }>(
        '/api/conversations',
        {
          postId: postId,
          postType: 'travel',
          recipientId: recipientId,
        }
      );
      console.log('[TravelDetails] Conversation created:', response);
      
      const conversationId = response.conversationId || response.id;
      
      if (!conversationId) {
        throw new Error('No conversation ID returned from server');
      }
      
      router.push(`/chat/${conversationId}`);
    } catch (err) {
      console.error('[TravelDetails] Error creating conversation:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to start conversation';
      if (errorMsg.includes('uuid') || errorMsg.includes('UUID')) {
        setError('Unable to start conversation. Please try again later.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setContacting(false);
    }
  };

  const handleShare = async () => {
    if (!travelPost) return;
    console.log('TravelDetailsScreen: Share post', id);
    
    try {
      const shareData = await authenticatedGet<{ shareUrl: string; title: string; description: string }>(
        `/api/posts/travel/${id}/share`
      );
      console.log('TravelDetailsScreen: Share data fetched', shareData);
      
      await Share.share({
        message: `${shareData.title}\n\n${shareData.description}\n\n${shareData.shareUrl}`,
        title: shareData.title,
        url: shareData.shareUrl,
      });
    } catch (error: any) {
      console.error('TravelDetailsScreen: Error sharing', error);
      const shareMessage = `Check out this travel post: ${travelPost.fromCity} ✈️ ${travelPost.toCity}`;
      await Share.share({
        message: shareMessage,
        title: `${travelPost.fromCity} ✈️ ${travelPost.toCity}`,
      });
    }
  };

  const handleEdit = () => {
    if (!travelPost) return;
    console.log('TravelDetailsScreen: Edit post', id);
    router.push({
      pathname: '/post-travel',
      params: {
        editId: id,
        editData: JSON.stringify(travelPost),
      },
    });
  };

  const handleDelete = async () => {
    if (!travelPost) return;
    console.log('TravelDetailsScreen: Close post', id);
    setDeleting(true);
    
    try {
      await authenticatedPatch(`/api/travel-posts/${id}/close`, {});
      console.log('TravelDetailsScreen: Post closed successfully');
      setShowDeleteModal(false);
      router.replace({
        pathname: '/my-posts',
        params: { tab: 'travel' }
      });
    } catch (error: any) {
      console.error('TravelDetailsScreen: Error closing post', error);
      setError(error.message || 'Failed to close post');
    } finally {
      setDeleting(false);
    }
  };

  const toggleFavorite = async () => {
    if (!travelPost) return;
    console.log('TravelDetailsScreen: Toggle favorite', id);
    
    const wasFavorited = isFavorited;
    setIsFavorited(!wasFavorited);
    
    try {
      if (wasFavorited) {
        await authenticatedDelete(`/api/favorites/${id}?postType=travel`, {});
      } else {
        await authenticatedPost('/api/favorites', { postId: id, postType: 'travel' });
      }
    } catch (error: any) {
      console.error('TravelDetailsScreen: Error toggling favorite', error);
      setIsFavorited(wasFavorited);
    }
  };

  // Show loading spinner only on initial load
  if (loading && !initialLoadComplete) {
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
  const travelDateDisplay = formatDateToDDMMYYYY(travelPost.travelDate);
  const travelDateToDisplay = travelPost.travelDateTo ? formatDateToDDMMYYYY(travelPost.travelDateTo) : null;
  const displayId = travelPost.shortId || travelPost.id.substring(0, 8);
  const postedDate = formatDateToDDMMYYYY(travelPost.createdAt);
  
  let tagLabel = '';
  const iconElements: React.ReactNode[] = [];
  
  if (travelPost.type === 'offering') {
    tagLabel = 'Offering';
    const hasCompanionship = travelPost.canOfferCompanionship;
    const hasCarry = travelPost.canCarryItems;
    
    if (hasCompanionship) {
      iconElements.push(
        <View key="companionship" style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>👥 Companionship</Text>
        </View>
      );
    }
    if (hasCarry) {
      iconElements.push(
        <View key="carry" style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>📦 Items</Text>
        </View>
      );
    }
  } else if (travelPost.type === 'seeking') {
    tagLabel = 'Seeking';
    iconElements.push(
      <View key="companionship" style={styles.iconBadge}>
        <Text style={styles.iconBadgeText}>👥 Companionship</Text>
      </View>
    );
  } else if (travelPost.type === 'seeking-ally') {
    tagLabel = 'Seeking';
    iconElements.push(
      <View key="carry" style={styles.iconBadge}>
        <Text style={styles.iconBadgeText}>📦 Items</Text>
      </View>
    );
  }
  
  const titleText = `${travelPost.fromCity} ✈️ ${travelPost.toCity}`;
  
  const hasIncentive = travelPost.incentive !== undefined && travelPost.incentive !== null;
  const incentiveDisplayText = hasIncentive ? travelPost.incentive?.displayText : null;
  const incentiveDisclaimer = hasIncentive ? travelPost.incentive?.disclaimer : null;
	
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            {tagLabel && (
              <View style={[styles.badge, { backgroundColor: travelPost.type === 'offering' ? '#D1FAE5' : '#DBEAFE' }]}>
                <Text style={[styles.badgeText, { color: travelPost.type === 'offering' ? '#065F46' : '#1E40AF' }]}>{tagLabel}</Text>
              </View>
            )}
            <View style={styles.actionButtons}>
              {!isOwnPost && (
                <TouchableOpacity style={styles.shareButton} onPress={toggleFavorite}>
                  <IconSymbol
                    ios_icon_name={isFavorited ? "heart.fill" : "heart"}
                    android_material_icon_name={isFavorited ? "favorite" : "favorite-border"}
                    size={20}
                    color={isFavorited ? colors.primary : colors.text}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <IconSymbol
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="share"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.title}>{titleText}</Text>
          
          {iconElements.length > 0 && (
            <View style={styles.iconBadgesContainer}>
              {iconElements}
            </View>
          )}

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

          {travelPost.item && travelPost.type === 'seeking-ally' && (
            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>Item:</Text>
              <Text style={styles.dateText}>{travelPost.item}</Text>
            </View>
          )}

          {travelPost.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description:</Text>
              <Text style={styles.description}>{travelPost.description}</Text>
            </View>
          )}

          {hasIncentive && incentiveDisplayText && (
            <View style={styles.incentiveContainer}>
              <Text style={styles.incentiveLabel}>Incentive:</Text>
              <Text style={styles.incentiveAmount}>{incentiveDisplayText}</Text>
            </View>
          )}

          {hasIncentive && incentiveDisclaimer && (
            <Text style={styles.incentiveDisclaimer}>
              {incentiveDisclaimer}
            </Text>
          )}

          <View style={styles.userContainer}>
            <View style={styles.userHeader}>
              <View>
                <Text style={styles.userLabel}>Posted by</Text>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{travelPost.user.username || travelPost.user.name}</Text>
                  <Text style={styles.postedDate}> • {postedDate}</Text>
                </View>
                <View style={styles.postIdContainer}>
                  <Text style={styles.postIdLabel}>Post ID: </Text>
                  <Text style={styles.postIdValue}>{displayId}</Text>
                </View>
              </View>
              {isOwnPost && (
                <View style={styles.ownerActions}>
                  {travelPost.status === 'open' && (
                    <TouchableOpacity style={styles.iconButton} onPress={handleEdit}>
                      <IconSymbol
                        ios_icon_name="pencil"
                        android_material_icon_name="edit"
                        size={20}
                        color={colors.text}
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.iconButton} onPress={() => setShowDeleteModal(true)}>
                    <IconSymbol
                      ios_icon_name="trash"
                      android_material_icon_name="delete"
                      size={20}
                      color="#FF3B30"
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
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
              <Text style={styles.contactButtonText}>Contact</Text>
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

      <Modal
        visible={showDeleteModal}
        title="Close Post"
        message="Are you sure you want to close this post? This action cannot be undone."
        onClose={() => setShowDeleteModal(false)}
        type="warning"
        actions={[
          {
            text: 'Cancel',
            onPress: () => setShowDeleteModal(false),
            style: 'cancel',
          },
          {
            text: deleting ? 'Closing...' : 'Close Post',
            onPress: handleDelete,
            style: 'destructive',
            disabled: deleting,
          },
        ]}
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
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  shareButton: {
    padding: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    ...typography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
  },
  iconBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  iconBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBadgeText: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 12,
  },
  postIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  postIdLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  postIdValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  dateLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  dateText: {
    ...typography.body,
    color: colors.text,
  },
  descriptionContainer: {
    marginBottom: spacing.md,
  },
  descriptionLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  incentiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  incentiveLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  incentiveAmount: {
    ...typography.body,
    color: colors.text,
  },
  incentiveDisclaimer: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 9,
    lineHeight: 12,
    marginBottom: spacing.md,
  },
  userContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  postedDate: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  ownerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
