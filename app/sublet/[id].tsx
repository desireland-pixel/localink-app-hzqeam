
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Platform, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPatch } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import { IconSymbol } from '@/components/IconSymbol';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Sublet {
  id: string;
  shortId?: string;
  userId: string;
  title: string;
  description?: string;
  city: string;
  availableFrom: string;
  availableTo: string;
  rent?: string;
  deposit?: string;
  cityRegistrationRequired?: boolean;
  type: 'offering' | 'seeking';
  imageUrls?: string[];
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username?: string;
  };
}

export default function SubletDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const [sublet, setSublet] = useState<Sublet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  console.log('SubletDetailsScreen: Rendering', { id, sublet, imageCount: sublet?.imageUrls?.length });

  useEffect(() => {
    if (id) {
      fetchSublet();
    }
  }, [id]);

  const fetchSublet = async () => {
    console.log('SubletDetailsScreen: Fetching sublet', id);
    setLoading(true);
    try {
      const data = await authenticatedGet<Sublet>(`/api/sublets/${id}`);
      console.log('SubletDetailsScreen: Fetched sublet', data);
      setSublet(data);
    } catch (error: any) {
      console.error('SubletDetailsScreen: Error fetching sublet', error);
      setError(error.message || 'Failed to load sublet');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async () => {
    if (!sublet) return;
    console.log('SubletDetailsScreen: Contact user', sublet.userId);
    
    try {
      const postId = typeof id === 'string' ? id : String(id);
      const recipientId = sublet.userId;
      
      console.log('SubletDetailsScreen: Creating conversation with postId:', postId, 'recipientId:', recipientId);
      
      const response = await authenticatedPost<{ id: string; conversationId?: string }>(
        '/api/conversations',
        {
          postId: postId,
          postType: 'sublet',
          recipientId: recipientId,
        }
      );
      console.log('SubletDetailsScreen: Conversation created', response);
      
      const conversationId = response.conversationId || response.id;
      
      if (!conversationId) {
        throw new Error('No conversation ID returned from server');
      }
      
      router.push(`/chat/${conversationId}`);
    } catch (error: any) {
      console.error('SubletDetailsScreen: Error creating conversation', error);
      const errorMsg = error.message || 'Failed to start conversation';
      if (errorMsg.includes('uuid') || errorMsg.includes('UUID')) {
        setError('Unable to start conversation. Please try again later.');
      } else {
        setError(errorMsg);
      }
    }
  };

  const handleShare = async () => {
    if (!sublet) return;
    console.log('SubletDetailsScreen: Share post', id);
    
    try {
      const shareData = await authenticatedGet<{ shareUrl: string; title: string; description: string }>(
        `/api/posts/sublet/${id}/share`
      );
      console.log('SubletDetailsScreen: Share data fetched', shareData);
      
      await Share.share({
        message: `${shareData.title}\n\n${shareData.description}\n\n${shareData.shareUrl}`,
        title: shareData.title,
        url: shareData.shareUrl,
      });
    } catch (error: any) {
      console.error('SubletDetailsScreen: Error sharing', error);
      const shareMessage = `Check out this sublet: ${sublet.title} in ${sublet.city}`;
      await Share.share({
        message: shareMessage,
        title: sublet.title,
      });
    }
  };

  const handleEdit = () => {
    if (!sublet) return;
    console.log('SubletDetailsScreen: Edit post', id);
    router.push({
      pathname: '/post-sublet',
      params: {
        editId: id,
        editData: JSON.stringify(sublet),
      },
    });
  };

  const handleDelete = async () => {
    if (!sublet) return;
    console.log('SubletDetailsScreen: Close post', id);
    setDeleting(true);
    
    try {
      await authenticatedPatch(`/api/sublets/${id}/close`, {});
      console.log('SubletDetailsScreen: Post closed successfully');
      setShowDeleteModal(false);
      router.replace('/my-posts');
    } catch (error: any) {
      console.error('SubletDetailsScreen: Error closing post', error);
      setError(error.message || 'Failed to close post');
    } finally {
      setDeleting(false);
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!sublet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Sublet not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fromDateDisplay = formatDateToDDMMYYYY(sublet.availableFrom);
  const toDateDisplay = formatDateToDDMMYYYY(sublet.availableTo);
  const isOwnPost = user?.id === sublet.userId;
  const hasImages = sublet.imageUrls && sublet.imageUrls.length > 0;
  const imageCount = sublet.imageUrls?.length || 0;
  const typeLabel = sublet.type === 'offering' ? 'Offering' : 'Seeking';
  const displayId = sublet.shortId || sublet.id.substring(0, 8);
  const postedDate = formatDateToDDMMYYYY(sublet.createdAt);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <View style={styles.imageContainer}>
          {hasImages ? (
            <>
              <FlatList
                ref={flatListRef}
                data={sublet.imageUrls}
                renderItem={({ item, index }) => (
                  <Image 
                    source={{ uri: item }} 
                    style={styles.image} 
                    contentFit="cover"
                    cachePolicy="none"
                    transition={200}
                    placeholder={require('@/assets/images/e0ef75c7-f2f2-4978-a582-c04be452d5cf.png')}
                    placeholderContentFit="contain"
                    priority={index === 0 ? 'high' : 'normal'}
                    onError={(error) => {
                      console.error('[SubletDetails] Image load error:', item, error);
                    }}
                  />
                )}
                keyExtractor={(item, index) => `${item}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              />
              {imageCount > 1 && (
                <View style={styles.imageIndicatorContainer}>
                  {sublet.imageUrls!.map((url, index) => (
                    <View
                      key={url}
                      style={[
                        styles.imageIndicator,
                        index === currentImageIndex && styles.imageIndicatorActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <IconSymbol
                ios_icon_name="photo"
                android_material_icon_name="image"
                size={64}
                color={colors.textLight}
              />
              <Text style={styles.imagePlaceholderText}>No photo available</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>{typeLabel}</Text>
          </View>
          {isOwnPost ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <IconSymbol
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="share"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <IconSymbol
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="share"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.title}>{sublet.title}</Text>
        
        <View style={styles.postIdContainer}>
          <Text style={styles.postIdLabel}>Post ID:</Text>
          <Text style={styles.postIdValue}>{displayId}</Text>
        </View>
        
        {sublet.description && (
          <Text style={styles.description}>{sublet.description}</Text>
        )}

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>{sublet.city}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{sublet.type === 'seeking' ? 'Move-in' : 'Available From'}</Text>
            <Text style={styles.infoValue}>{fromDateDisplay || 'Not specified'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{sublet.type === 'seeking' ? 'Move-out' : 'Available To'}</Text>
            <Text style={styles.infoValue}>{toDateDisplay || 'Not specified'}</Text>
          </View>
          
          {sublet.rent && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{sublet.type === 'seeking' ? 'Budget' : 'Rent'}</Text>
              <Text style={styles.infoValue}>€{sublet.rent}/month</Text>
            </View>
          )}

          {sublet.deposit && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deposit</Text>
              <Text style={styles.infoValue}>€{sublet.deposit}</Text>
            </View>
          )}

          {sublet.cityRegistrationRequired !== undefined && (
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>City Registration</Text>
              <Text style={styles.infoValue}>
                {sublet.cityRegistrationRequired ? 'Yes' : 'No'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.authorSection}>
          <View style={styles.authorHeader}>
            <View>
              <Text style={styles.authorLabel}>Posted by</Text>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName}>{sublet.user.username || sublet.user.name}</Text>
                <Text style={styles.postedDate}> • {postedDate}</Text>
              </View>
            </View>
            {isOwnPost && (
              <View style={styles.ownerActions}>
                <TouchableOpacity style={styles.iconButton} onPress={handleEdit}>
                  <IconSymbol
                    ios_icon_name="pencil"
                    android_material_icon_name="edit"
                    size={20}
                    color={colors.text}
                  />
                </TouchableOpacity>
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
      </ScrollView>

      {!isOwnPost && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={!!error}
        title="Error"
        message={error}
        onClose={() => setError('')}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    ...typography.h3,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: colors.border,
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: 250,
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  imagePlaceholderText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  imageIndicatorContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageIndicatorActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  typeTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  typeTagText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  postIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  postIdLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  postIdValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  infoSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  authorSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
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
  msgButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  msgButtonText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contactButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  contactButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
