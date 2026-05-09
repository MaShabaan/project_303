import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import Groq from 'groq-sdk';
import { tryChatCommand } from '@/utils/chatCommands';

const API_KEY = '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';

const groq = new Groq({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_SUGGESTIONS = [
  'How do I submit a complaint?',
  'How to rate a course?',
  'What are the ticket statuses?',
  'How to check my complaint?',
  'How do I enroll in a course?',
];

export default function AIAssistantScreen() {
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "👋 Welcome to the Academic Feedback System Assistant!\n\nI'm here to help you with:\n• Submitting complaints about courses/instructors\n• Rating courses after enrollment\n• Tracking your complaint status\n• Understanding system features\n\nWhat can I help you with today?",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessageToGroq = async (messagesHistory: ChatMessage[], context?: string): Promise<string> => {
    try {
      const systemPrompt = `You are a helpful AI assistant for an academic feedback and complaints management system called "Academic Feedback System". Your role is to help users with:

1. Understanding how to submit complaints about courses or instructors
2. Guiding users through the course rating process
3. Explaining how to track complaint status
4. Providing information about the system features
5. Helping with general academic-related questions

Be friendly, concise, and helpful. Keep responses short and practical for mobile users.

${context ? `\nUser context: ${context}` : ''}`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...messagesHistory.map(msg => ({ role: msg.role, content: msg.content })),
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 500,
      });

      return chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      
    } catch (error) {
      console.error('Groq API error:', error);
      return 'Sorry, I encountered an error. Please try again later.';
    }
  };

  const handleSend = async (text?: string) => {
    const messageToSend = text || inputText.trim();
    if (!messageToSend || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    const cmd = tryChatCommand(messageToSend, true);
    if (cmd) {
      setMessages(prev => [...prev, { role: 'assistant', content: cmd.reply }]);
      setLoading(false);
      setTimeout(() => router.push(cmd.href), 500);
      return;
    }

    const context = `User: ${profile?.displayName || profile?.email || 'Guest'}, Role: ${profile?.role || 'user'}`;
    const reply = await sendMessageToGroq([...messages, userMessage], context);
    
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.messageRow, item.role === 'user' ? styles.userRow : styles.assistantRow]}>
      {item.role === 'assistant' && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🤖</Text>
        </View>
      )}
      <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
        <Text style={item.role === 'user' ? styles.userText : styles.assistantText}>
          {item.content}
        </Text>
      </View>
      {item.role === 'user' && (
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>👤</Text>
        </View>
      )}
    </View>
  );

  const renderQuickSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.suggestionChip}
      onPress={() => handleSend(item)}
    >
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "👋 Welcome back! I'm the Academic Feedback System Assistant. How can I help you today?",
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🤖 AI Assistant</Text>
          <Text style={styles.headerSubtitle}>Powered by Groq</Text>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContent}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          messages.length === 1 ? (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Quick questions:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsList}>
                {QUICK_SUGGESTIONS.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => handleSend(item)}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!loading}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]} 
            onPress={() => handleSend()} 
            disabled={!inputText.trim() || loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f5ff' },
  header: { 
    paddingTop: 50, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  clearButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  chatContent: { padding: 16, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarText: { fontSize: 16 },
  userAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  userAvatarText: { fontSize: 14, color: '#fff' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 20 },
  userBubble: { backgroundColor: '#7c3aed', borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#ede9fe' },
  userText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  assistantText: { color: '#1e1b4b', fontSize: 15, lineHeight: 20 },
  inputContainer: { flexDirection: 'row', padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ede9fe', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, maxHeight: 100, fontSize: 15, color: '#1e1b4b' },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7c3aed', marginLeft: 10, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  suggestionsContainer: { marginBottom: 16 },
  suggestionsTitle: { fontSize: 12, color: '#64748b', marginBottom: 8, marginLeft: 4 },
  suggestionsList: { gap: 8, paddingRight: 16 },
  suggestionChip: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#ede9fe', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  suggestionText: { fontSize: 13, color: '#7c3aed', fontWeight: '500' },
});