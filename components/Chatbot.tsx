import React, { useState, useRef, useEffect } from 'react';
import { startChatSession } from '../services/geminiService';
import type { Message } from '../types';
// Fix: Import the Chat type for better type safety.
import type { Chat } from '@google/genai';


const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // Fix: Use the specific Chat type from the SDK.
    const [chat, setChat] = useState<Chat | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);


    // When the chatbot opens, initialize the chat session.
    useEffect(() => {
        if (isOpen && !chat && !apiError) {
            setIsLoading(true);
            try {
                const chatSession = startChatSession();
                setChat(chatSession);
                
                // Send an initial message to get a greeting.
                const getGreeting = async () => {
                    try {
                        // Fix: The new SDK's `sendMessageStream` expects an object with a `message` property.
                        const response = await chatSession.sendMessageStream({ message: "Merhaba" });
                        
                        let fullResponse = "";
                        const botMessageId = Date.now();
                        setMessages([{ id: botMessageId, text: '', sender: 'bot' }]); // Add an empty message bubble

                        // Fix: The new SDK returns an async iterator directly, not an object with a `stream` property.
                        // Fix: The `text()` method is now a `text` property on the chunk.
                        for await (const chunk of response) {
                            fullResponse += chunk.text;
                            setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: fullResponse } : m));
                        }
                    } catch (e: any) {
                        setApiError("Asistandan yanıt alınamadı. Lütfen daha sonra tekrar deneyin.");
                        console.error(e);
                    } finally {
                        setIsLoading(false);
                    }
                };
                getGreeting();

            } catch (e: any) {
                setApiError(e.message || "Asistan başlatılamadı.");
                setIsLoading(false);
            }
        }
    }, [isOpen, chat, apiError]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = userInput.trim();
        if (!trimmedInput || isLoading || !chat) return;

        const newUserMessage: Message = { id: Date.now(), text: trimmedInput, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            // Fix: The new SDK's `sendMessageStream` expects an object with a `message` property.
            const responseStream = await chat.sendMessageStream({ message: trimmedInput });
            
            let fullResponse = "";
            const botMessageId = Date.now() + 1;
            // Add an empty placeholder message for the bot's response
            setMessages(prev => [...prev, { id: botMessageId, text: '', sender: 'bot' }]);

            // Fix: The new SDK returns an async iterator directly, not an object with a `stream` property.
            // Fix: The `text()` method is now a `text` property on the chunk.
            for await (const chunk of responseStream) {
                fullResponse += chunk.text;
                // Update the placeholder message with new chunks
                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: fullResponse } : m));
            }

        } catch (e: any) {
            console.error("Error sending message to Gemini:", e);
            const errorMessage: Message = { id: Date.now() + 1, text: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.", sender: 'bot' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const getPlaceholderText = () => {
        if (apiError) return 'Asistan kullanılamıyor.';
        if (isLoading && messages.length === 0) return 'Asistan başlatılıyor...';
        if (isLoading) return 'Asistan yanıtlıyor...';
        return 'Bir mesaj yazın...';
    };
    
    const isDisabled = isLoading || !!apiError;

    return (
        <>
            <button
                className="chatbot-fab"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Chatbot'u Aç"
            >
                <i className={`fas ${isOpen ? 'fa-times' : 'fa-comments'} fa-lg`}></i>
            </button>

            <div className={`chatbot-window ${!isOpen ? 'closed' : ''}`}>
                <header className="chatbot-header">
                    <span>Lezzetin Mimarı Asistanı</span>
                    <button onClick={() => setIsOpen(false)} className="text-white bg-transparent border-none text-2xl font-bold">&times;</button>
                </header>
                <div className="chatbot-messages">
                    {apiError && (
                        <div className="message-bubble bot-message bg-red-100 text-red-800">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            {apiError}
                        </div>
                    )}
                    {messages.map(msg => (
                        <div key={msg.id} className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}>
                            {msg.text}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message-bubble bot-message">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form className="chatbot-input-form" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder={getPlaceholderText()}
                        className="chatbot-input"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        disabled={isDisabled}
                        aria-label="Chatbot'a mesaj gönder"
                    />
                    <button type="submit" className="chatbot-send-btn" disabled={isDisabled || !userInput.trim()} aria-label="Gönder">
                        <i className="fas fa-paper-plane fa-lg"></i>
                    </button>
                </form>
            </div>
        </>
    );
};

export default Chatbot;
