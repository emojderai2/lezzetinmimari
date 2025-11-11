import React, { useState, useRef, useEffect, useCallback } from 'react';
import { fetchVisibleMenuData } from '../services/supabaseService';
import type { MenuCategoryWithItems, Message } from '../types';


const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "Merhaba! Restoranımız veya menümüz hakkında ne öğrenmek istersiniz?",
            sender: 'bot'
        }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // In-component cache using useRef to persist chat session and menu data
    const chatRef = useRef<any | null>(null);
    const menuCacheRef = useRef<string | null>(null);
    
    // --- Gemini Logic ---

    const getChatbotResponse = useCallback(async (message: string): Promise<string> => {
        
        const getMenuContext = async (): Promise<string> => {
            if (menuCacheRef.current) {
                return menuCacheRef.current;
            }
            try {
                const categories: MenuCategoryWithItems[] = await fetchVisibleMenuData();
                if (!categories || categories.length === 0) {
                    return "Menü şu anda mevcut değil.";
                }
                const menuString = categories.map(category => {
                    const itemsString = category.menu_items
                        .map(item => `- ${item.name}` + (item.price ? `: ${item.price} TL` : ''))
                        .join('\n');
                    return `Kategori: ${category.name}\n${itemsString}`;
                }).join('\n\n');
                menuCacheRef.current = menuString;
                return menuCacheRef.current;
            } catch (error) {
                console.error("Failed to fetch menu for context:", error);
                return "Menü bilgisi alınamadı.";
            }
        };

        const initializeChat = async (): Promise<any> => {
            if (chatRef.current) {
                return chatRef.current;
            }
            
            // Dynamically import the library only when it's needed for the first time.
            // Use the esm.sh CDN which is robust for ES Modules and can solve fetching issues.
            const { GoogleGenAI } = await import('https://esm.sh/@google/genai@0.14.2');

            const apiKey = process.env.API_KEY;

            if (!apiKey) {
                console.error("API_KEY is not available. Please configure it in AI Studio secrets.");
                throw new Error("API Anahtarı bulunamadı. Lütfen AI Studio ayarlarınızı kontrol edin.");
            }

            const ai = new GoogleGenAI({ apiKey: apiKey });
            const menuContext = await getMenuContext();
            const systemInstruction = `
                Sen, 'Lezzetin Mimarı' adlı bir restoranın yardımsever ve bilgili yapay zeka asistanısın.
                Görevin, müşterilerin menü, ürünler, fiyatlar ve genel restoran bilgileri hakkındaki sorularını yanıtlamaktır.
                Sadece sana verilen menü bağlamını kullanarak cevap ver. Menüde olmayan ürünler hakkında spekülasyon yapma, bunun yerine "Bu ürün menümüzde bulunmuyor." de.
                Cevapların kısa, net ve samimi olsun.
                Unutma, senin bilgin SADECE aşağıdaki menü ile sınırlıdır.

                ### MENÜ ###
                ${menuContext}
                ### BİTTİ ###
            `;
            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: systemInstruction,
                }
            });
            chatRef.current = chat;
            return chat;
        };

        try {
            const chatSession = await initializeChat();
            const response = await chatSession.sendMessage({ message });
            return response.text;
        } catch (error) {
            console.error("CRITICAL ERROR in chatbot:", error);
            chatRef.current = null; // Invalidate chat session on error
            if (error instanceof Error) {
                if (error.message.includes('API key not valid') || error.message.includes('API_KEY')) {
                    throw new Error("API Anahtarınız geçersiz veya ayarlanmamış. Lütfen AI Studio ayarlarınızı kontrol edin.");
                }
                throw error;
            }
            throw new Error("Üzgünüm, yapay zeka asistanına şu anda ulaşılamıyor.");
        }
    }, []);

    // --- Component Logic ---

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = userInput.trim();
        if (!trimmedInput || isLoading) return;

        const newUserMessage: Message = {
            id: Date.now(),
            text: trimmedInput,
            sender: 'user'
        };

        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);
        
        try {
            const responseText = await getChatbotResponse(trimmedInput);
            const botResponse: Message = {
                id: Date.now() + 1,
                text: responseText,
                sender: 'bot'
            };
            setMessages(prev => [...prev, botResponse]);
        } catch (error: any) {
            console.error("Failed to get chatbot response:", error);
            const errorResponse: Message = {
                id: Date.now() + 1,
                text: error.message || "Üzgünüm, bir sorun oluştu. Lütfen tekrar deneyin.",
                sender: 'bot'
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsLoading(false);
        }
    };

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
                        placeholder="Bir mesaj yazın..."
                        className="chatbot-input"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        disabled={isLoading}
                        aria-label="Chatbot'a mesaj gönder"
                    />
                    <button type="submit" className="chatbot-send-btn" disabled={isLoading || !userInput.trim()} aria-label="Gönder">
                        <i className="fas fa-paper-plane fa-lg"></i>
                    </button>
                </form>
            </div>
        </>
    );
};

export default Chatbot;