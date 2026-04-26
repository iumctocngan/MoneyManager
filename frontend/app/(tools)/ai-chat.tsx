import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store/app-store';
import { Colors, SoftColors, shadow } from '@/constants/design';
import { ChatMessage } from '@/store/types';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import { api } from '@/utils/api';

export default function AIChatScreen() {
  const insets = useSafeAreaInsets();
  const { 
    chatMessages, 
    chatSessions,
    sendChatMessage, 
    isBusy, 
    listSessions, 
    loadSessionMessages,
    createNewSession,
    deleteSession,
    currentSessionId,
    stopChat,
  } = useStore();
  
  const [inputText, setInputText] = useState('');

  const [showHistory, setShowHistory] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    listSessions();
  }, [listSessions]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const msg = inputText.trim();
    setInputText('');
    await sendChatMessage(msg);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      await sendChatMessage('Quét hóa đơn này giúp tôi', uri);
    }
  };

  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages]);

  const selectSession = async (sessionId: string) => {
    await loadSessionMessages(sessionId);
    setShowHistory(false);
  };

  const handlePressSend = () => {
    if (isBusy) {
      stopChat();
    } else {
      handleSend();
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    if (Platform.OS === 'web') {
      if (confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) {
        deleteSession(sessionId);
      }
      return;
    }

    // @ts-ignore - Alert exists on mobile
    import('react-native').then(({ Alert }) => {
      Alert.alert(
        'Xóa cuộc trò chuyện',
        'Bạn có chắc muốn xóa cuộc trò chuyện này? Toàn bộ tin nhắn sẽ bị mất.',
        [
          { text: 'Hủy', style: 'cancel' },
          { 
            text: 'Xóa', 
            style: 'destructive',
            onPress: () => deleteSession(sessionId)
          },
        ]
      );
    });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {item.fileUri && (
            <View style={styles.filePreview}>
              <Image 
                source={{ 
                  uri: item.fileUri.startsWith('/uploads/') 
                    ? `${api.API_BASE_URL}${item.fileUri}` 
                    : item.fileUri 
                }} 
                style={styles.previewImage} 
              />
            </View>
          )}
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Trợ lý AI</Text>
              <Text style={styles.headerSubtitle}>MoneyManager Smart Assistant</Text>
            </View>
            <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.headerIcon}>
              <Ionicons name="time-outline" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={createNewSession} style={styles.headerIcon}>
              <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => currentSessionId && handleDeleteSession(currentSessionId)} 
              style={[styles.headerIcon, !currentSessionId && { opacity: 0.3 }]}
              disabled={!currentSessionId}
            >
              <Ionicons name="trash-outline" size={22} color={Colors.danger} />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={chatMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {isBusy && (
            <View style={styles.busyContainer}>
              <ActivityIndicator color={SoftColors.primary} size="small" />
              <Text style={styles.busyText}>AI đang suy nghĩ...</Text>
            </View>
          )}

          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TouchableOpacity style={styles.toolButton} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Hỏi tôi về chi tiêu của bạn..."
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!isBusy}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton, 
                !inputText.trim() && !isBusy && styles.sendButtonDisabled,
                isBusy && { backgroundColor: Colors.danger }
              ]}
              onPress={handlePressSend}
              disabled={!inputText.trim() && !isBusy}
            >
              <Ionicons 
                name={isBusy ? "stop" : "send"} 
                size={isBusy ? 22 : 20} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showHistory}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lịch sử trò chuyện</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={chatSessions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.sessionItem}
                  onPress={() => selectSession(item.id)}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.sessionDate}>
                      {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleDeleteSession(item.id)}
                    style={styles.deleteSessionBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiMessage: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SoftColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    ...shadow.card,
  },
  userBubble: {
    backgroundColor: SoftColors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: Colors.text,
  },
  filePreview: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: 200,
    height: 150,
    resizeMode: 'cover',
  },

  busyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  busyText: {
    marginLeft: 8,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  toolButton: {
    padding: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginHorizontal: 8,
    maxHeight: 100,
  },
  input: {
    fontSize: 15,
    paddingVertical: 8,
    color: Colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SoftColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
  },
  headerIcon: {
    padding: 8,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FE',
  },
  sessionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyHistory: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  deleteSessionBtn: {
    padding: 10,
    marginRight: 5,
  },
});
