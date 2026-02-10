
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import { IconSymbol } from '@/components/IconSymbol';

interface Sublet {
  id: string;
  userId: string;
  title: string;
  description?: string;
  city: string;
  availableFrom: string;
  availableTo: string;
  rent?: string;
  type: 'offering' | 'seeking';
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
  const [error, setError] = useState('');

  console.log('SubletDetailsScreen: Rendering', { id, sublet });

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
      const response = await authenticatedPost<{ conversationId: string }>(
        '/api/conversations',
        {
          postId: id,
          postType: 'sublet',
          recipientId: sublet.userId,
        }
      );
      console.log('SubletDetailsScreen: Conversation created', response);
      router.push(`/chat/${response.conversationId}`);
    } catch (error: any) {
      console.error('SubletDetailsScreen: Error creating conversation', error);
      setError(error.message || 'Failed to start conversation');
    }
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
  const hasImage = sublet.imageUrls && sublet.imageUrls.length > 0;
  const typeLabel = sublet.type === 'offering' ? 'Offering' : 'Seeking';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <View style={styles.imageContainer}>
          {hasImage ? (
            <Image source={{ uri: sublet.imageUrls![0] }} style={styles.image} />
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

        <View style={styles.typeTag}>
          <Text style={styles.typeTagText}>{typeLabel}</Text>
        </View>

        <Text style={styles.title}>{sublet.title}</Text>
        
        {sublet.description && (
          <Text style={styles.description}>{sublet.description}</Text>
        )}

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>{sublet.city}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Available From</Text>
            <Text style={styles.infoValue}>{fromDateDisplay}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Available To</Text>
            <Text style={styles.infoValue}>{toDateDisplay}</Text>
          </View>
          
          {sublet.rent && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rent</Text>
              <Text style={styles.infoValue}>€{sublet.rent}/month</Text>
            </View>
          )}
        </View>

        <View style={styles.authorSection}>
          <View style={styles.authorHeader}>
            <View>
              <Text style={styles.authorLabel}>Posted by</Text>
              <Text style={styles.authorName}>{sublet.user.name}</Text>
            </View>
            {!isOwnPost && (
              <TouchableOpacity style={styles.msgButton} onPress={handleContact}>
                <IconSymbol
                  ios_icon_name="message.fill"
                  android_material_icon_name="message"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.msgButtonText}>Msg</Text>
              </TouchableOpacity>
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
  },
  image: {
    width: '100%',
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
  typeTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.sm,
  },
  typeTagText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
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
  authorName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
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
