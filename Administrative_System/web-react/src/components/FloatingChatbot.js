

import React, { useState, useRef, useEffect } from 'react';
import './FloatingChatbot.css';

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY ;


const detectLanguage = (text) => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  if (arabicPattern.test(text)) return 'ar';
  return 'en';
};


const getGroqResponse = async (message, language) => {
  try {
  
    const systemPrompt = language === 'ar' 
      ? `أنت مساعد ذكي في نظام إدارة جامعي.
        
قواعد صارمة:
1. ردودك مختصرة جداً (جملة واحدة قصيرة كحد أقصى)
2. ساعد في: تسجيل المواد، التقييم، الشكاوى، البروفايل
3. إذا كان السؤال خارج النظام، قل: "هذا خارج نطاق مساعداتي"
4. **أهم حاجة: رد باللغة العربية فقط**

مثال على رد صحيح:
سؤال: "ازاي أسجل مواد؟"
رد: "اذهب إلى صفحة تسجيل المواد من القائمة."`
      : `You are a university assistant.

Strict rules:
1. Keep responses very short (one short sentence maximum)
2. Help with: course registration, ratings, complaints, profile
3. If question is outside the system, say: "This is outside my scope"
4. **IMPORTANT: Respond in English only**

Example:
User: "how to enroll?"
Reply: "Go to enrollment page from the menu."`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.5,
        max_tokens: 100
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error("Groq API Error:", data.error);
      return language === 'ar' ? "⚠️ حدث خطأ" : "⚠️ Error occurred";
    }
    
    return data.choices?.[0]?.message?.content || (language === 'ar' ? "عذراً، لم أفهم" : "Sorry, didn't understand");
  } catch (error) {
    console.error("Groq API Error:", error);
    return language === 'ar' ? "⚠️ خطأ في الاتصال" : "⚠️ Connection error";
  }
};

const handleCommand = (message, onNavigate) => {
  const lower = message.toLowerCase();
  

  if (lower.includes('البروفايل') || lower === 'بروفايلي') {
    return { reply: '👤 جاري فتح البروفايل...', page: 'profile', isCommand: true, language: 'ar' };
  }
  if (lower.includes('تسجيل مواد') || lower.includes('تسجيل') || lower.includes('مواد')) {
    return { reply: '📚 جاري فتح تسجيل المواد...', page: 'enroll-courses', isCommand: true, language: 'ar' };
  }
  if (lower.includes('تقييم') || lower.includes('قيم')) {
    return { reply: '⭐ جاري فتح صفحة التقييم...', page: 'rate-course', isCommand: true, language: 'ar' };
  }
  if (lower.includes('شكواي') || lower.includes('شكاوى')) {
    return { reply: '📋 جاري فتح صفحة شكواي...', page: 'my-tickets', isCommand: true, language: 'ar' };
  }
  if (lower.includes('شكوى جديدة') || lower.includes('تقديم شكوى')) {
    return { reply: '✏️ جاري فتح نموذج شكوى جديدة...', page: 'submit-ticket', isCommand: true, language: 'ar' };
  }
  
 
  if (lower.includes('profile')) {
    return { reply: '👤 Opening profile...', page: 'profile', isCommand: true, language: 'en' };
  }
  if (lower.includes('enroll') || lower.includes('registration')) {
    return { reply: '📚 Opening registration...', page: 'enroll-courses', isCommand: true, language: 'en' };
  }
  if (lower.includes('rate') || lower.includes('rating')) {
    return { reply: '⭐ Opening rating page...', page: 'rate-course', isCommand: true, language: 'en' };
  }
  if (lower.includes('my tickets') || lower.includes('complaints')) {
    return { reply: '📋 Opening my tickets...', page: 'my-tickets', isCommand: true, language: 'en' };
  }
  if (lower.includes('new ticket') || lower.includes('new complaint')) {
    return { reply: '✏️ Opening new complaint...', page: 'submit-ticket', isCommand: true, language: 'en' };
  }
  
  return null;
};

export default function FloatingChatbot({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: Date.now(),
        text: "👋 Hello! I'm your university assistant.\n\nمرحباً! أنا مساعدك الجامعي.\n\n📌 Commands | الأوامر:\n• profile | البروفايل\n• enroll | تسجيل مواد\n• rate | تقييم\n• my tickets | شكواي\n• new ticket | شكوى جديدة\n\nAsk me in English or Arabic!",
        sender: 'bot',
        time: new Date().toLocaleTimeString()
      }]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    const userLanguage = detectLanguage(userMessage);
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      time: new Date().toLocaleTimeString()
    }]);
    
    setInput('');
    setIsTyping(true);

    const command = handleCommand(userMessage, onNavigate);
    
    if (command && command.isCommand) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: command.reply,
        sender: 'bot',
        time: new Date().toLocaleTimeString()
      }]);
      
      setTimeout(() => {
        onNavigate(command.page);
      }, 500);
      
      setIsTyping(false);
      return;
    }

    let reply = await getGroqResponse(userMessage, userLanguage);
    if (!reply) {
      reply = userLanguage === 'ar' ? "عذراً، حاول مرة أخرى." : "Sorry, try again.";
    }

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        text: reply,
        sender: 'bot',
        time: new Date().toLocaleTimeString()
      }]);
      setIsTyping(false);
    }, 500);
  };

  const handleKeyPress = (e) => e.key === 'Enter' && sendMessage();

  return (
    <>
      {!isOpen && (
        <button className="chatbot-float-btn" onClick={() => setIsOpen(true)}>
          <span className="chatbot-float-icon">🤖</span>
        </button>
      )}

      {isOpen && (
        <div className="chatbot-float-window">
          <div className="chatbot-float-header">
            <div className="chatbot-float-title">
              <span className="chatbot-float-icon">🤖</span>
              <span>University Assistant</span>
            </div>
            <button className="chatbot-float-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="chatbot-float-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`float-message ${msg.sender === 'user' ? 'float-message-user' : 'float-message-bot'}`}>
                <div className="float-message-bubble">
                  <div className="float-message-text">{msg.text}</div>
                  <div className="float-message-time">{msg.time}</div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="float-message float-message-bot">
                <div className="float-message-bubble typing">...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-float-input-area">
            <input
              type="text"
              className="chatbot-float-input"
              placeholder="Ask me... | اسألني..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button className="chatbot-float-send" onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}