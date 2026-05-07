import Groq from 'groq-sdk';

const API_KEY = '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';

const groq = new Groq({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true, // مهم للتطبيقات Expo
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessageToGroq(
  messages: ChatMessage[],
  context?: string
): Promise<string> {
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
        ...messages.map(msg => ({ role: msg.role, content: msg.content })),
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
}