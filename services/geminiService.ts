// Fix: Import GoogleGenAI instead of the deprecated GoogleGenerativeAI. Import Chat for type safety.
import { GoogleGenAI, Chat } from "@google/genai";

// The API key is injected by the execution environment.
// @ts-ignore
const API_KEY = process.env.API_KEY;

// Fix: Use the correct type for the ai instance.
let ai: GoogleGenAI;

// Fix: Update the return type to GoogleGenAI.
const getAi = (): GoogleGenAI => {
    if (!ai) {
        if (!API_KEY) {
             throw new Error("Gemini API anahtarı bulunamadı. Lütfen AI Studio ayarlarını kontrol edin.");
        }
        // Fix: The new constructor requires the API key to be passed as an object with an apiKey property.
        ai = new GoogleGenAI({ apiKey: API_KEY });
    }
    return ai;
}

// Fix: The new SDK uses `ai.chats.create`. The return type is now `Chat`.
export const startChatSession = (): Chat => {
    const aiInstance = getAi();
    
    const systemInstructionText = `You are a friendly and helpful assistant for 'Lezzetin Mimarı' restaurant.
Your name is Lezzet Bot. You can answer questions about the restaurant's concept, story, values, and event days (November 26-30).
You DO NOT have access to the live menu, specific prices, or real-time availability for reservations.
If asked about the menu or specific dishes, politely explain that you don't have live menu details but you can talk about Turkish cuisine in general, and recommend the user check the menu on the main page.
If asked for a reservation, explain that online reservations are not available for the event.
Keep your answers friendly, helpful, and concise. Respond in Turkish.`;

    // Fix: Use the new `ai.chats.create` method.
    const chat = aiInstance.chats.create({
      // Fix: Use a current, non-deprecated model. 'gemini-2.5-flash' is suitable for chat.
      model: 'gemini-2.5-flash',
      // Fix: System instruction is now a string property within a `config` object.
      config: {
        systemInstruction: systemInstructionText,
      },
    });

    return chat;
};
