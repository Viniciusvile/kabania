import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { processTaskWithAI } from '../services/geminiService';
import './Dashboard.css';

  export default function AIChatFab({ currentCompany }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Olá! Sou a IA integrada. Posso consultar o histórico da empresa ou analisar tarefas. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    const response = await processTaskWithAI(userMessage, currentCompany?.id);
    
    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setIsTyping(false);
  };

  return (
    <div className="ai-chat-fab-container">
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-chat-header-title">
              <Sparkles size={16} /> Assistente corporativo
            </div>
            <button onClick={() => setIsOpen(false)} className="ai-chat-header-close">
              <X size={20} />
            </button>
          </div>
          
          <div className="ai-chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-msg-row ${msg.role}`}>
                <div className="ai-message-bubble">
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="ai-msg-row ai">
                <div className="ai-typing">
                  <Sparkles size={14} className="text-accent" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} /> Digitando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="ai-chat-input-area">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Faça uma pergunta corporativa..." 
              className="ai-chat-input"
            />
            <button type="submit" disabled={isTyping || !input.trim()} className="ai-chat-send">
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
      
      <button className="fab-button cursor-pointer mt-4" onClick={() => setIsOpen(!isOpen)}>
        <span className="fab-text">PERGUNTE À IA</span>
        <div className="fab-icon-wrapper">
          <Bot size={28} className="text-accent" />
          <div className="fab-glow"></div>
        </div>
      </button>
    </div>
  );
}
