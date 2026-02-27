
import React from 'react';
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

interface ModalAction {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
  disabled?: boolean;
}

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'error' | 'success' | 'warning';
  actions?: ModalAction[];
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Modal({ 
  visible, 
  onClose, 
  title, 
  message, 
  type = 'info', 
  actions,
  confirmText,
  cancelText,
  onConfirm
}: ModalProps) {
  const getIconForType = () => {
    switch (type) {
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  // If confirmText and cancelText are provided, create two-button actions
  let modalActions: ModalAction[];
  if (confirmText && cancelText && onConfirm) {
    modalActions = [
      {
        text: cancelText,
        onPress: onClose,
        style: 'cancel',
      },
      {
        text: confirmText,
        onPress: onConfirm,
        style: type === 'warning' ? 'destructive' : 'default',
      },
    ];
  } else if (actions) {
    modalActions = actions;
  } else {
    modalActions = [
      {
        text: 'OK',
        onPress: onClose,
        style: 'default',
      },
    ];
  }

  // Parse message to handle HTML-like tags
  const parseMessage = (msg: string) => {
    // Remove HTML tags and format the text
    let parsed = msg
      .replace(/<h1>/g, '\n\n')
      .replace(/<\/h1>/g, '\n')
      .replace(/<h2>/g, '\n\n')
      .replace(/<\/h2>/g, '\n')
      .replace(/<h3>/g, '\n')
      .replace(/<\/h3>/g, '\n')
      .replace(/<p>/g, '\n')
      .replace(/<\/p>/g, '\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<li>/g, '\n• ')
      .replace(/<\/li>/g, '')
      .replace(/<ul>/g, '\n')
      .replace(/<\/ul>/g, '\n')
      .replace(/<ol>/g, '\n')
      .replace(/<\/ol>/g, '\n')
      .replace(/<strong>/g, '')
      .replace(/<\/strong>/g, '')
      .replace(/<em>/g, '')
      .replace(/<\/em>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    // Remove excessive newlines
    parsed = parsed.replace(/\n{3,}/g, '\n\n');
    
    return parsed;
  };

  const formattedMessage = parseMessage(message);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{getIconForType()}</Text>
          </View>
          
          <Text style={styles.title}>{title}</Text>
          
          <ScrollView 
            style={styles.messageScrollView}
            contentContainerStyle={styles.messageScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.message}>{formattedMessage}</Text>
          </ScrollView>

          <View style={styles.actionsContainer}>
            {modalActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionButton,
                  action.style === 'cancel' && styles.cancelButton,
                  action.style === 'destructive' && styles.destructiveButton,
                  action.disabled && styles.disabledButton,
                ]}
                onPress={action.onPress}
                disabled={action.disabled}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    action.style === 'cancel' && styles.cancelButtonText,
                    action.style === 'destructive' && styles.destructiveButtonText,
                  ]}
                >
                  {action.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontSize: 16,
    fontWeight: '700',
  },
  messageScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.4,
    marginBottom: spacing.md,
  },
  messageScrollContent: {
    paddingVertical: spacing.xs,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destructiveButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontSize: 14,
  },
  cancelButtonText: {
    color: colors.text,
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
});
