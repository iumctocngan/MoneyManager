import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SoftColors, shadow } from '@/constants/design';
import { LinearGradient } from 'expo-linear-gradient';

interface SoftSuccessModalProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export function SoftSuccessModal({
  visible,
  title = 'Thành công',
  message,
  onClose,
}: SoftSuccessModalProps) {
  const [scaleAnim] = React.useState(new Animated.Value(0.8));
  const [opacityAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.content}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={[SoftColors.primary, SoftColors.primaryDark]}
                style={styles.iconGradient}
              >
                <Ionicons name="checkmark" size={40} color="#fff" />
              </LinearGradient>
              <View style={styles.iconGlow} />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Tuyệt vời</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(21, 32, 50, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 32,
    overflow: 'hidden',
    ...shadow.soft,
  },
  content: {
    padding: 30,
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 20,
    position: 'relative',
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    ...shadow.glow,
  },
  iconGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: SoftColors.primaryGlow,
    top: -5,
    left: -5,
    zIndex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: SoftColors.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: SoftColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 22,
    ...shadow.glow,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
