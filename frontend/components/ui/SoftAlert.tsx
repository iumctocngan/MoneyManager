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
import { Colors, SoftColors, shadow } from '@/constants/design';
import { LinearGradient } from 'expo-linear-gradient';
import { create } from 'zustand';

/** Định nghĩa một nút bấm trong dialog alert, tương tự API của React Native Alert. */
export interface SoftAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/** State nội bộ của alert — dùng Zustand để cho phép gọi alert từ ngoài component tree. */
interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: SoftAlertButton[];
  type: 'info' | 'success' | 'warning' | 'error';
  show: (
    title: string,
    message: string,
    buttons?: SoftAlertButton[],
    type?: 'info' | 'success' | 'warning' | 'error'
  ) => void;
  hide: () => void;
}

/**
 * Zustand store cho alert — dùng pattern imperative (gọi trực tiếp qua `useAlertStore.getState()`)
 * thay vì truyền props, cho phép trigger alert từ bất kỳ đâu (hook, service, v.v.).
 */
export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: '',
  message: '',
  buttons: [],
  type: 'info',
  show: (title, message, buttons = [], type = 'info') =>
    set({ visible: true, title, message, buttons, type }),
  hide: () => set({ visible: false }),
}));

/**
 * API tĩnh thay thế cho `Alert.alert()` của React Native.
 * Tự động suy ra `type` từ nội dung title/message nếu không truyền tường minh,
 * giúp code gọi alert gọn hơn mà vẫn hiển thị đúng màu sắc/icon.
 */
export const SoftAlert = {
  alert: (
    title: string,
    message: string,
    buttons?: SoftAlertButton[],
    type?: 'info' | 'success' | 'warning' | 'error'
  ) => {
    let inferredType: 'info' | 'success' | 'warning' | 'error' = type || 'info';
    // Nếu không truyền type, suy ra từ từ khoá trong title/message
    if (!type) {
      const lowerTitle = title.toLowerCase();
      const lowerMessage = message.toLowerCase();
      const isLogout =
        lowerTitle.includes('đăng xuất') ||
        lowerTitle.includes('logout') ||
        lowerTitle.includes('log out');

      if (isLogout) {
        // Đăng xuất dùng 'info' thay vì 'warning' để tránh cảm giác tiêu cực
        inferredType = 'info';
      } else if (
        lowerTitle.includes('xoá') ||
        lowerTitle.includes('xóa') ||
        lowerTitle.includes('hủy') ||
        lowerTitle.includes('huỷ') ||
        buttons?.some((b) => b.style === 'destructive')
      ) {
        inferredType = 'warning';
      } else if (
        lowerTitle.includes('lỗi') ||
        lowerTitle.includes('thất bại') ||
        lowerTitle.includes('không thể') ||
        lowerMessage.includes('không tìm thấy') ||
        lowerMessage.includes('thiếu')
      ) {
        inferredType = 'error';
      } else if (
        lowerTitle.includes('thành công') ||
        lowerTitle.includes('tuyệt vời')
      ) {
        inferredType = 'success';
      }
    }
    useAlertStore.getState().show(title, message, buttons, inferredType);
  },
};

const { width } = Dimensions.get('window');

/** Component render alert dialog — phải được mount một lần duy nhất ở root layout. */
export function SoftAlertComponent() {
  const { visible, title, message, buttons, type, hide } = useAlertStore();

  // Khởi tạo animated values bên ngoài useEffect để tránh re-create mỗi lần render
  const [scaleAnim] = React.useState(new Animated.Value(0.85));
  const [opacityAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      // Dùng spring cho scale để cảm giác dialog "bật" ra tự nhiên, không cứng
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset ngay (không animate) khi ẩn để lần mở tiếp theo bắt đầu từ trạng thái ban đầu
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  // Không render gì khi ẩn — tránh Modal chiếm lớp touch của màn hình
  if (!visible) return null;

  // Map type to icons and colors
  let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'information';
  let iconColors: [string, string] = [SoftColors.blue || Colors.info, Colors.info];
  let glowColor = 'rgba(116, 167, 255, 0.28)';

  const lowerTitle = title.toLowerCase();
  const isLogout =
    lowerTitle.includes('đăng xuất') ||
    lowerTitle.includes('logout') ||
    lowerTitle.includes('log out');

  // Chọn icon và màu glow tương ứng với từng loại alert
  if (isLogout) {
    iconName = 'log-out-outline';
    iconColors = [SoftColors.blue || Colors.info, Colors.info];
    glowColor = 'rgba(116, 167, 255, 0.28)';
  } else if (type === 'success') {
    iconName = 'checkmark';
    iconColors = [SoftColors.primary, SoftColors.primaryDark];
    glowColor = SoftColors.primaryGlow;
  } else if (type === 'warning') {
    iconName = 'warning';
    iconColors = [SoftColors.yellow || Colors.warning, Colors.warning];
    glowColor = 'rgba(255, 201, 77, 0.28)';
  } else if (type === 'error') {
    iconName = 'alert-circle';
    iconColors = [SoftColors.red || Colors.danger, Colors.danger];
    glowColor = 'rgba(255, 98, 111, 0.28)';
  }

  const handleButtonPress = (btn: SoftAlertButton) => {
    hide();
    if (btn.onPress) {
      // Delay nhỏ để Modal đóng trước khi callback chạy,
      // tránh navigation conflict khi callback push một màn hình mới
      setTimeout(() => {
        btn.onPress?.();
      }, 100);
    }
  };

  /** Render layout nút: 0 nút → mặc định "Đồng ý", 2 nút → nằm ngang, nhiều hơn → xếp dọc. */
  const renderButtons = () => {
    if (!buttons || buttons.length === 0) {
      return (
        <TouchableOpacity
          onPress={hide}
          activeOpacity={0.84}
          style={[styles.button, styles.buttonDefault]}
        >
          <Text style={[styles.buttonText, styles.buttonDefaultText]}>Đồng ý</Text>
        </TouchableOpacity>
      );
    }

    if (buttons.length === 2) {
      const leftBtn = buttons[0];
      const rightBtn = buttons[1];

      return (
        <View style={styles.rowButtons}>
          <TouchableOpacity
            onPress={() => handleButtonPress(leftBtn)}
            activeOpacity={0.84}
            style={[
              styles.buttonHalf,
              leftBtn.style === 'cancel'
                ? styles.buttonCancel
                : leftBtn.style === 'destructive'
                ? styles.buttonDestructive
                : styles.buttonDefault,
            ]}
          >
            <Text
              style={[
                styles.buttonHalfText,
                leftBtn.style === 'cancel'
                  ? styles.buttonCancelText
                  : leftBtn.style === 'destructive'
                  ? styles.buttonDestructiveText
                  : styles.buttonDefaultText,
              ]}
            >
              {leftBtn.text}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleButtonPress(rightBtn)}
            activeOpacity={0.84}
            style={[
              styles.buttonHalf,
              rightBtn.style === 'cancel'
                ? styles.buttonCancel
                : rightBtn.style === 'destructive'
                ? styles.buttonDestructive
                : styles.buttonDefault,
            ]}
          >
            <Text
              style={[
                styles.buttonHalfText,
                rightBtn.style === 'cancel'
                  ? styles.buttonCancelText
                  : rightBtn.style === 'destructive'
                  ? styles.buttonDestructiveText
                  : styles.buttonDefaultText,
              ]}
            >
              {rightBtn.text}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.stackedButtons}>
        {buttons.map((btn, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleButtonPress(btn)}
            activeOpacity={0.84}
            style={[
              styles.button,
              btn.style === 'cancel'
                ? styles.buttonCancel
                : btn.style === 'destructive'
                ? styles.buttonDestructive
                : styles.buttonDefault,
              { marginTop: index > 0 ? 10 : 0 },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                btn.style === 'cancel'
                  ? styles.buttonCancelText
                  : btn.style === 'destructive'
                  ? styles.buttonDestructiveText
                  : styles.buttonDefaultText,
              ]}
            >
              {btn.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    // animationType="none" vì animation được xử lý thủ công bằng Animated API để kiểm soát tốt hơn
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
              <LinearGradient colors={iconColors} style={styles.iconGradient}>
                <Ionicons name={iconName} size={38} color="#fff" />
              </LinearGradient>
              {/* Vòng glow phía sau icon — tạo hiệu ứng ánh sáng lan toả */}
              <View style={[styles.iconGlow, { backgroundColor: glowColor }]} />
            </View>

            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            <View style={styles.buttonsContainer}>{renderButtons()}</View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 32, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    // Giới hạn chiều rộng tối đa trên tablet; trên điện thoại dùng 88% màn hình
    width: width > 420 ? 380 : width * 0.88,
    backgroundColor: '#fff',
    borderRadius: 28,
    overflow: 'hidden',
    ...shadow.soft,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 16,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    ...shadow.glow,
  },
  iconGlow: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: SoftColors.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  buttonsContainer: {
    width: '100%',
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  rowButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  buttonHalf: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonHalfText: {
    fontSize: 15,
    fontWeight: '800',
  },
  stackedButtons: {
    width: '100%',
  },
  buttonDefault: {
    backgroundColor: SoftColors.primary,
    ...shadow.glow,
  },
  buttonDefaultText: {
    color: '#fff',
  },
  buttonCancel: {
    backgroundColor: '#F3F6F4',
    borderWidth: 1,
    borderColor: 'rgba(174, 213, 188, 0.3)',
  },
  buttonCancelText: {
    color: SoftColors.muted,
  },
  buttonDestructive: {
    backgroundColor: Colors.danger,
    ...shadow.glow,
  },
  buttonDestructiveText: {
    color: '#fff',
  },
});
