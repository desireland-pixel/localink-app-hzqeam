
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPatch, authenticatedPut, authenticatedDelete } from '@/utils/api';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import Modal from '@/components/ui/Modal';
import { IconSymbol } from '@/components/IconSymbol';

const CATEGORY_COLORS: { [key: string]: { background: string; text: string } } = {
  'Visa': { background: '#DBEAFE', text: '#1E40AF' },
  'Insurance': { background: '#FEF3C7', text: '#92400E' },
  'Housing': { background: '#D1FAE5', text: '#065F46' },
  'Jobs': { background: '#FCE7F3', text: '#9F1239' },
  'Healthcare': { background: '#E0E7FF', text: '#3730A3' },
  'Finance': { background: '#FED7AA', text: '#9A3412' },
  'Education': { background: '#E9D5FF', text: '#6B21A8' },
  'General': { background: '#FDE68A', text: '#78350F' },
};

interface Post {
  id: string;
  title?: string;
  description?: string;
  city?: string;
  fromCity?: string;
  toCity?: string;
  availableFrom?: string;
  availableTo?: string;
  travelDate?: string;
  travelDateTo?: string;
  rent?: string;
  type?: string;
  status: string;
  createdAt: string;
  category?: string;
  location?: string;
  canOfferCompanionship?: boolean;
  canCarryItems?: boolean;
  companionshipFor?: string;
  item?: string;
  incentiveAmount?: number;
}

export default function MyPostsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'sublet' | 'travel' | 'community'>('sublet');
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState('');
  const [closingPostId, setClosingPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  console.log('MyPostsScreen: Rendering', { selectedTab, postsCount: posts.length });
  
  // Handle tab parameter from navigation
  useEffect(() => {
    if (params.tab === 'travel' || params.tab === 'sublet' || params.tab === 'community') {
      setSelectedTab(params.tab);
    }
  }, [params.tab]);

  const fetchPosts = React.useCallback(async () => {
    console.log('MyPostsScreen: Fetching posts', { selectedTab });
    setLoading(true);
    try {
      let data: Post[] = [];
      if (selectedTab === 'sublet') {
        data = await authenticatedGet<Post[]>('/api/my/sublets');
      } else if (selectedTab === 'travel') {
        data = await authenticatedGet<Post[]>('/api/my/travel-posts');
      } else if (selectedTab === 'community') {
        data = await authenticatedGet<Post[]>('/api/my/community/topics');
      }
      console.log('MyPostsScreen: Fetched posts', data);
      // Sort by createdAt descending (newest first)
      const sortedData = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(sortedData);
    } catch (error: any) {
      console.error('MyPostsScreen: Error fetching posts', error);
      setError(error.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [selectedTab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = async () => {
    console.log('MyPostsScreen: Refreshing posts', { selectedTab });
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleClosePost = async (postId: string) => {
    console.log('MyPostsScreen: Closing post', { postId, selectedTab });
    setClosingPostId(postId);
    try {
      if (selectedTab === 'sublet') {
        await authenticatedPatch(`/api/sublets/${postId}/close`, {});
      } else if (selectedTab === 'travel') {
        await authenticatedPatch(`/api/travel-posts/${postId}/close`, {});
      } else if (selectedTab === 'community') {
        // Update status to closed
        await authenticatedPut(`/api/community/topics/${postId}`, { status: 'closed' });
      }
      console.log('MyPostsScreen: Post closed successfully');
      await fetchPosts();
    } catch (error: any) {
      console.error('MyPostsScreen: Error closing post', error);
      setError(error.message || 'Failed to close post');
    } finally {
      setClosingPostId(null);
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    console.log('MyPostsScreen: Deleting post permanently', { postId: postToDelete, selectedTab });
    setDeletingPostId(postToDelete);
    
    try {
      if (selectedTab === 'sublet') {
        await authenticatedDelete(`/api/sublets/${postToDelete}`, {});
      } else if (selectedTab === 'travel') {
        await authenticatedDelete(`/api/travel-posts/${postToDelete}`, {});
      } else if (selectedTab === 'community') {
        await authenticatedDelete(`/api/community/topics/${postToDelete}`, {});
      }
      console.log('MyPostsScreen: Post deleted successfully');
      setShowDeleteModal(false);
      setPostToDelete(null);
      await fetchPosts();
    } catch (error: any) {
      console.error('MyPostsScreen: Error deleting post', error);
      setError(error.message || 'Failed to delete post');
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleViewPost = (postId: string) => {
    console.log('MyPostsScreen: View post', { postId, selectedTab });
    if (selectedTab === 'sublet') {
      router.push(`/sublet/${postId}`);
    } else if (selectedTab === 'travel') {
      router.push(`/travel/${postId}`);
    } else if (selectedTab === 'community') {
      router.push(`/carry/${postId}`);
    }
  };

  const handleEditPost = (postId: string) => {
    console.log('MyPostsScreen: Edit post', { postId, selectedTab });
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    if (selectedTab === 'sublet') {
      router.push({
        pathname: '/post-sublet',
        params: {
          editId: postId,
          editData: JSON.stringify(post),
        },
      });
    } else if (selectedTab === 'travel') {
      router.push({
        pathname: '/post-travel',
        params: {
          editId: postId,
          editData: JSON.stringify(post),
        },
      });
    } else if (selectedTab === 'community') {
      router.push({
        pathname: '/post-community-topic',
        params: {
          editId: postId,
          editData: JSON.stringify(post),
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'sublet' && styles.tabActive]}
          onPress={() => setSelectedTab('sublet')}
        >
          <Text style={[styles.tabText, selectedTab === 'sublet' && styles.tabTextActive]}>
            Sublet
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'travel' && styles.tabActive]}
          onPress={() => setSelectedTab('travel')}
        >
          <Text style={[styles.tabText, selectedTab === 'travel' && styles.tabTextActive]}>
            Travel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'community' && styles.tabActive]}
          onPress={() => setSelectedTab('community')}
        >
          <Text style={[styles.tabText, selectedTab === 'community' && styles.tabTextActive]}>
            Community
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>Your {selectedTab} posts will appear here</Text>
            </View>
          ) : (
            posts.map((post) => {
              const isClosing = closingPostId === post.id;
              const isClosed = post.status === 'closed';
              
              return (
                <TouchableOpacity
                  key={post.id}
                  style={[styles.postCard, isClosed && styles.postCardClosed]}
                  onPress={() => handleViewPost(post.id)}
                >
                  {selectedTab === 'sublet' && (
                    <>
                      <View style={styles.postHeader}>
                        <View style={[styles.typeTag, { backgroundColor: post.type === 'offering' ? '#D1FAE5' : '#DBEAFE' }]}>
                          <Text style={[styles.typeTagText, { color: post.type === 'offering' ? '#065F46' : '#1E40AF' }]}>
                            {post.type === 'offering' ? 'Offering' : 'Seeking'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.postTitle}>{post.title}</Text>
                      <View style={styles.postInfo}>
                        <Text style={styles.postInfoText}>{post.city}</Text>
                        {post.rent && (
                          <>
                            <Text style={styles.postInfoText}>•</Text>
                            <Text style={styles.postInfoText}>€{post.rent}/month</Text>
                          </>
                        )}
                      </View>
                      {(post.availableFrom || post.availableTo) && (
                        <View style={styles.dateRow}>
                          {post.availableFrom && <Text style={styles.dateText}>{formatDateToDDMMYYYY(post.availableFrom)}</Text>}
                          {post.availableFrom && post.availableTo && <Text style={styles.dateSeparator}>-</Text>}
                          {post.availableTo && <Text style={styles.dateText}>{formatDateToDDMMYYYY(post.availableTo)}</Text>}
                        </View>
                      )}
                      {post.description && (
                        <Text style={styles.postDescription} numberOfLines={2}>
                          {post.description}
                        </Text>
                      )}
                    </>
                  )}
                  
                  {selectedTab === 'travel' && (
                    <>
                      <View style={styles.postHeader}>
                        <View style={styles.tagRow}>
                          <View style={[styles.typeTag, { backgroundColor: post.type === 'offering' ? '#D1FAE5' : post.type === 'seeking' ? '#DBEAFE' : '#FCE7F3' }]}>
                            <Text style={[styles.typeTagText, { color: post.type === 'offering' ? '#065F46' : post.type === 'seeking' ? '#1E40AF' : '#9F1239' }]}>
                              {post.type === 'offering' ? 'Offering' : post.type === 'seeking' ? 'Seeking' : 'Seeking Ally'}
                            </Text>
                          </View>
                          {post.type === 'offering' && (() => {
                            const offeringIconText = post.canOfferCompanionship && post.canCarryItems ? '👥, 📦' : 
                                                     post.canOfferCompanionship ? '👥' : 
                                                     post.canCarryItems ? '📦' : '👥, 📦';
                            return <Text style={styles.iconText}>{offeringIconText}</Text>;
                          })()}
                          {post.type === 'seeking' && <Text style={styles.iconText}>👥</Text>}
                          {post.type === 'seeking-ally' && <Text style={styles.iconText}>📦</Text>}
                        </View>
                        {post.incentiveAmount && post.incentiveAmount > 0 && (
                          <View style={styles.incentiveTag}>
                            <Text style={styles.incentiveTagText}>Incentive</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.routeContainer}>
                        <Text style={styles.routeText}>{post.fromCity}</Text>
                        <Text style={styles.routeArrow}>→</Text>
                        <Text style={styles.routeText}>{post.toCity}</Text>
                      </View>
                      {(post.travelDate || post.travelDateTo) && (
                        <View style={styles.travelDateRow}>
                          {post.travelDate && <Text style={styles.dateText}>{formatDateToDDMMYYYY(post.travelDate)}</Text>}
                          {post.travelDate && post.travelDateTo && <Text style={styles.dateSeparator}>-</Text>}
                          {post.travelDateTo && <Text style={styles.dateText}>{formatDateToDDMMYYYY(post.travelDateTo)}</Text>}
                        </View>
                      )}
                      {post.type === 'seeking-ally' && post.item && (
                        <View style={styles.itemRow}>
                          <Text style={styles.itemLabel}>Item: </Text>
                          <Text style={styles.itemValue}>{post.item}</Text>
                        </View>
                      )}
                      {post.type === 'seeking' && post.companionshipFor && (
                        <View style={styles.itemRow}>
                          <Text style={styles.itemLabel}>For: </Text>
                          <Text style={styles.itemValue}>{post.companionshipFor}</Text>
                        </View>
                      )}
                      {post.description && (
                        <Text style={styles.postDescription} numberOfLines={2}>
                          {post.description}
                        </Text>
                      )}
                    </>
                  )}
                  
                  {selectedTab === 'community' && (
                    <>
                      <View style={styles.postHeader}>
                        {(() => {
                          const categoryColor = CATEGORY_COLORS[post.category || 'General'] || CATEGORY_COLORS['General'];
                          const categoryBackgroundColor = isClosed ? '#E5E7EB' : categoryColor.background;
                          const categoryTextColor = isClosed ? '#6B7280' : categoryColor.text;
                          
                          return (
                            <View style={[styles.categoryBadge, { backgroundColor: categoryBackgroundColor }]}>
                              <Text style={[styles.categoryBadgeText, { color: categoryTextColor }]}>
                                {post.category || 'General'}
                              </Text>
                            </View>
                          );
                        })()}
                      </View>
                      <Text style={styles.postTitle}>{post.title}</Text>
                      {post.description && (
                        <Text style={styles.postDescription} numberOfLines={2}>
                          {post.description}
                        </Text>
                      )}
                      <View style={styles.postInfo}>
                        <Text style={styles.postInfoText}>
                          {post.createdAt && formatDateToDDMMYYYY(post.createdAt)}
                        </Text>
                      </View>
                    </>
                  )}
                  
                  <View style={styles.postActions}>
                    <View style={[styles.statusBadge, isClosed && styles.statusBadgeClosed]}>
                      <Text style={[styles.statusText, isClosed && styles.statusTextClosed]}>
                        {isClosed ? 'Closed' : 'Active'}
                      </Text>
                    </View>
                    <View style={styles.actionButtons}>
                      {!isClosed ? (
                        <>
                          <TouchableOpacity
                            style={styles.editIconButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleEditPost(post.id);
                            }}
                          >
                            <IconSymbol
                              ios_icon_name="pencil"
                              android_material_icon_name="edit"
                              size={20}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.deleteButton, deletingPostId === post.id && styles.deleteButtonDisabled]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setPostToDelete(post.id);
                              setShowDeleteModal(true);
                            }}
                            disabled={deletingPostId === post.id}
                          >
                            {deletingPostId === post.id ? (
                              <ActivityIndicator size="small" color="#FF3B30" />
                            ) : (
                              <Text style={styles.deleteButtonText}>Delete</Text>
                            )}
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={[styles.deleteButton, deletingPostId === post.id && styles.deleteButtonDisabled]}
                          onPress={(e) => {
                            e.stopPropagation();
                            setPostToDelete(post.id);
                            setShowDeleteModal(true);
                          }}
                          disabled={deletingPostId === post.id}
                        >
                          {deletingPostId === post.id ? (
                            <ActivityIndicator size="small" color="#FF3B30" />
                          ) : (
                            <Text style={styles.deleteButtonText}>Delete</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
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
        title="Delete Post"
        message="Are you sure you want to permanently delete this post? This action cannot be undone."
        onClose={() => {
          setShowDeleteModal(false);
          setPostToDelete(null);
        }}
        type="warning"
        actions={[
          {
            text: 'Cancel',
            onPress: () => {
              setShowDeleteModal(false);
              setPostToDelete(null);
            },
            style: 'cancel',
          },
          {
            text: deletingPostId ? 'Deleting...' : 'Delete',
            onPress: handleDeletePost,
            style: 'destructive',
            disabled: !!deletingPostId,
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postCardClosed: {
    opacity: 0.6,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  iconText: {
    fontSize: 16,
  },
  incentiveTag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  incentiveTagText: {
    ...typography.bodySmall,
    color: '#6B21A8',
    fontSize: 12,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  itemValue: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  typeTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeTagText: {
    ...typography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    ...typography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
  },
  postTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    fontSize: 16,
    fontWeight: '600',
  },
  postDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontSize: 12,
    lineHeight: 18,
  },
  postInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  postInfoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  routeText: {
    ...typography.h3,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  routeArrow: {
    ...typography.h3,
    color: colors.textSecondary,
    fontSize: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  travelDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 0,
    marginBottom: spacing.xs,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  dateSeparator: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  postRent: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeClosed: {
    backgroundColor: '#E5E7EB',
  },
  statusText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  statusTextClosed: {
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  editIconButton: {
    padding: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareIconButton: {
    padding: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  closeButtonDisabled: {
    opacity: 0.5,
  },
  closeButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    ...typography.bodySmall,
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 12,
  },
});
