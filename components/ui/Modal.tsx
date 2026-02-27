
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal as RNModal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
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
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  type?: 'info' | 'error' | 'success' | 'confirm' | 'warning';
  actions?: ModalAction[];
}

export default function Modal({
  visible,
  onClose,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  type = 'info',
  actions,
}: ModalProps) {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      case 'confirm':
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  // Check if message is long (for Terms & Conditions)
  const isLongMessage = message.length > 500;

  // If custom actions are provided, use them instead of default buttons
  const renderButtons = () => {
    if (actions && actions.length > 0) {
      return (
        <View style={styles.buttonContainer}>
          {actions.map((action, index) => {
            const isDestructive = action.style === 'destructive';
            const isCancel = action.style === 'cancel';
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  isCancel ? styles.cancelButton : styles.confirmButton,
                  isDestructive && styles.destructiveButton,
                  action.disabled && styles.disabledButton,
                ]}
                onPress={action.onPress}
                disabled={action.disabled}
              >
                <Text
                  style={[
                    isCancel ? styles.cancelButtonText : styles.confirmButtonText,
                    isDestructive && styles.destructiveButtonText,
                  ]}
                >
                  {action.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    // Default buttons
    return (
      <View style={styles.buttonContainer}>
        {(type === 'confirm' || type === 'warning') && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>{cancelText}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.confirmButton]}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>{confirmText}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modal, isLongMessage && styles.modalLarge]}>
              <Text style={styles.icon}>{getIcon()}</Text>
              {title && <Text style={styles.title}>{title}</Text>}
              {isLongMessage ? (
                <ScrollView style={styles.messageScrollView} showsVerticalScrollIndicator={true}>
                  <Text style={styles.message}>{message}</Text>
                </ScrollView>
              ) : (
                <Text style={styles.message}>{message}</Text>
              )}
              {renderButtons()}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  modal: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalLarge: {
    maxHeight: '80%',
  },
  icon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  messageScrollView: {
    maxHeight: 300,
    marginBottom: spacing.md,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.button,
    fontSize: 13,
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    ...typography.button,
    fontSize: 13,
    color: '#FFFFFF',
  },
  destructiveButton: {
    backgroundColor: '#FF3B30',
  },
  destructiveButtonText: {
    ...typography.button,
    fontSize: 13,
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
