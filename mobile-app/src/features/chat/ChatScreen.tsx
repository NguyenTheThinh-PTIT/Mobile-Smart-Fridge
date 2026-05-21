import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { axiosClient } from '@/core/network/AxiosClient';

type ChatMessage = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
};

type ChatApiResponse = {
  code?: number;
  message?: string;
  data?: {
    sessionId?: number;
    answer?: string;
  };
};

type ChatHistoryResponse = {
  sessionId: number | null;
  messages: Array<{
    id: number;
    senderType: string;
    content: string;
    timestamp: string;
  }>;
};

/**
 * Local-only welcome message shown when no server history exists.
 * This is never sent to the backend; it's a UI convenience for new users.
 */
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-ai',
  text: 'Chao ban, minh la tro ly SmartFridge. Hom nay ban muon quan ly tu lanh hay tim mon an nao?',
  isUser: false,
  timestamp: new Date().toISOString(),
};

/**
 * Number of most-recent messages to show initially (lazy load strategy).
 */
const INITIAL_VISIBLE_COUNT = 6;
/**
 * How many more messages to reveal when the user taps "load more".
 */
const LOAD_MORE_STEP = 6;
/**
 * How many historical messages to fetch from the server per load.
 * Balances freshness with API and rendering cost.
 */
const HISTORY_FETCH_LIMIT = 50;
const MIN_MESSAGES_FOR_LOAD_MORE = 8;

/**
 * Format a message timestamp for display using the Vietnamese locale.
 */
const formatMessageTime = (raw: string): string => {
  if (!raw) {
    return '';
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

/**
 * ChatScreen component: shows conversation history and allows sending messages.
 * - Uses `useFocusEffect` to refresh messages when navigating back to this screen.
 * - Uses a `sessionIdRef` to keep session state without triggering re-renders.
 */
export const ChatScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(64);
  const sessionIdRef = useRef<number | null>(null);
  // sessionIdRef giữ session hiện tại nhưng không gây re-render khi thay đổi
  // tránh cập nhật UI không cần thiết khi backend trả về id mới

  const canSend = useMemo(() => inputText.trim().length > 0 && !isLoading, [inputText, isLoading]);

  /**
   * TASK 2: Fetch message history when screen is focused
   * This ensures messages are restored when navigating back to chat
   */
  useFocusEffect(
    React.useCallback(() => {
      const loadChatHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const response = await axiosClient.get<ChatHistoryResponse>('/chat/history', {
            params: { limit: HISTORY_FETCH_LIMIT },
          });

          const payload: any = response;
          const historyData: ChatHistoryResponse | null = payload?.data || payload || null;
          const messagesData = historyData?.messages || [];

          // Lưu sessionId mà server trả về vào ref để dùng cho lần gửi tiếp theo
          sessionIdRef.current = historyData?.sessionId ?? null;

          // Nếu server có lịch sử, chuyển đổi sang định dạng UI và hiển thị
          if (Array.isArray(messagesData) && messagesData.length > 0) {
            const formattedMessages = messagesData
              .map((msg) => ({
                id: String(msg.id),
                text: msg.content || '',
                isUser: msg.senderType === 'USER',
                timestamp: msg.timestamp,
              }));

            setMessages(formattedMessages);
            // Hiển thị một phần lịch sử ban đầu để tránh render quá nhiều item
            setVisibleCount(Math.min(INITIAL_VISIBLE_COUNT, formattedMessages.length));
            if (__DEV__) {
              console.log(
                `[ChatScreen] Loaded ${formattedMessages.length} messages from token-based history, sessionId: ${sessionIdRef.current}`
              );
            }
          } else {
            setMessages([WELCOME_MESSAGE]);
            setVisibleCount(1);
            if (__DEV__) {
              console.log('[ChatScreen] No message history found for current user');
            }
          }
        } catch (error) {
          console.warn('[ChatScreen] Failed to load message history', error);
          setMessages([WELCOME_MESSAGE]);
        } finally {
          setIsLoadingHistory(false);
        }
      };

      loadChatHistory();

      return () => {};
    }, [])
  );

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  const visibleMessages = useMemo(() => {
    if (visibleCount <= 0) {
      return messages;
    }

    return messages.slice(Math.max(0, messages.length - visibleCount));
  }, [messages, visibleCount]);

  // visibleCount implements a lazy-load window: only the last N messages are rendered
  // to improve performance on long histories.

  const hiddenMessageCount = Math.max(0, messages.length - visibleMessages.length);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const onShow = (event: KeyboardEvent) => {
      // Android keyboard heights vary by device/version; track manually for stable layout
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    };

    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLoadMoreMessages = () => {
    setVisibleCount((current) => Math.min(messages.length, current + LOAD_MORE_STEP));
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ animated: true, offset: 0 });
    });
  };

  const extractAiText = (payload: unknown): string => {
    const body = payload as ChatApiResponse | undefined;
    const candidate = body?.data?.answer || (payload as any)?.answer;
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
    return 'Minh dang gap su co khi tao cau tra loi. Ban thu lai sau it phut nhe.';
  };

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      text: content,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    // Optimistic update: show user's message immediately for snappy UI
    appendMessage(userMessage);
    setInputText('');
    setIsLoading(true);

    try {
      const requestBody: { message: string; sessionId?: number } = { message: content };
      if (typeof sessionIdRef.current === 'number' && sessionIdRef.current > 0) {
        requestBody.sessionId = sessionIdRef.current;
      }

      const res = await axiosClient.post<ChatApiResponse>('/chat/send', {
        ...requestBody,
      });

      // ApiResponse wrapper: { code, message, data: { sessionId, answer, ... } }
      const responseData = (res as ChatApiResponse | undefined)?.data;
      if (responseData?.sessionId) {
        sessionIdRef.current = responseData.sessionId;
      }

      const aiMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        text: extractAiText(res),
        isUser: false,
        timestamp: new Date().toISOString(),
      };

      appendMessage(aiMessage);
    } catch (error) {
      const fallback: ChatMessage = {
        id: `e-${Date.now()}`,
        text: 'AI tam thoi bi gian doan. Ban vui long thu lai trong it phut.',
        isUser: false,
        timestamp: new Date().toISOString(),
      };

      appendMessage(fallback);

      if (__DEV__) {
        console.error('[ChatScreen] send message failed', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.isUser;
    const aiBubbleBackground = '#EAF1FF';

    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAi]}>
        {!isUser ? (
          <View style={[styles.aiAvatar, { backgroundColor: `${theme.colors.primary}18` }]}>
            <MaterialCommunityIcons name="robot-outline" size={14} color={theme.colors.primary} />
          </View>
        ) : null}
        <View style={[styles.messageGroup, isUser ? styles.messageGroupUser : styles.messageGroupAi]}>
          <View
            style={[
              styles.bubble,
              isUser
                ? [styles.userBubble, { backgroundColor: theme.colors.primary }]
                : [styles.aiBubble, { backgroundColor: aiBubbleBackground }],
            ]}
          >
            <Text style={[styles.bubbleText, isUser ? styles.userText : styles.aiText]}>{item.text}</Text>
          </View>
          <Text style={[styles.timestampText, isUser ? styles.timestampUser : styles.timestampAi]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderHistoryHeader = () => {
    if (messages.length < MIN_MESSAGES_FOR_LOAD_MORE || hiddenMessageCount <= 0) {
      return null;
    }

    return (
      <TouchableOpacity style={styles.loadMoreButton} activeOpacity={0.85} onPress={handleLoadMoreMessages}>
        <MaterialCommunityIcons name="history" size={16} color={theme.colors.primary} />
        <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>Xem thêm {hiddenMessageCount} tin nhắn cũ</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.header, { borderBottomColor: '#E2E8F0', backgroundColor: theme.colors.surface }]}> 
          <View style={styles.headerMainRow}>
            <View style={[styles.headerAvatar, { backgroundColor: `${theme.colors.primary}18` }]}>
              <MaterialCommunityIcons name="robot-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerTitle}>Trợ lý SmartFridge</Text>
              <View style={styles.headerStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.headerSubTitle}>Sẵn sàng hỗ trợ nấu ăn và quản lý tủ lạnh</Text>
              </View>
            </View>
          </View>
        </View>

        {isLoadingHistory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Đang tải lịch sử chat...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={visibleMessages}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom:
                  20 +
                  composerHeight +
                  (Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom) +
                  (Platform.OS === 'android' ? keyboardHeight : 0),
              },
            ]}
            renderItem={renderMessage}
            ListHeaderComponent={renderHistoryHeader}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {isLoading && !isLoadingHistory ? (
          <View style={[styles.loadingRow, { backgroundColor: '#F8FAFC' }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Trợ lý đang soạn câu trả lời...</Text>
          </View>
        ) : null}

        {/* useSafeAreaInsets() ensures composer padding accounts for notch/rounded corners */}
        <View
          onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}
          style={[
            styles.composer,
            {
              backgroundColor: theme.colors.background,
              paddingBottom:
                10 + (Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom),
            },
            Platform.OS === 'android' && keyboardHeight > 0
              ? { marginBottom: keyboardHeight }
              : null,
          ]}
        >
          <View style={[styles.composerInner, { borderColor: '#E2E8F0', backgroundColor: theme.colors.surface }]}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#94A3B8"
              style={styles.input}
              multiline
              editable={!isLoadingHistory}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!canSend}
              style={[
                styles.sendButton,
                {
                  backgroundColor: canSend ? theme.colors.primary : '#CBD5E1',
                },
              ]}
              onPress={handleSend}
            >
              <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerStatusRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerSubTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 20,
    backgroundColor: '#F5F8FD',
  },
  messageList: {
    flex: 1,
  },
  loadMoreButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D6E4FF',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  bubbleRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAi: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 16,
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 11,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  userBubble: {
    maxWidth: '96%',
    borderBottomRightRadius: 8,
  },
  aiBubble: {
    maxWidth: '88%',
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE8FF',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#0F172A',
  },
  messageGroup: {
    flexShrink: 1,
  },
  messageGroupUser: {
    alignItems: 'flex-end',
  },
  messageGroupAi: {
    alignItems: 'flex-start',
  },
  timestampText: {
    marginTop: 5,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  timestampUser: {
    textAlign: 'right',
  },
  timestampAi: {
    textAlign: 'left',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 6,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  composerInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
});
