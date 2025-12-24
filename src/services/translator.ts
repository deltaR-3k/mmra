import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type APIProvider = 'openai' | 'gemini';
export type Tone = 'casual' | 'neutral' | 'formal';

interface TranslateOptions {
    text: string;
    apiKey: string;
    provider: APIProvider;
    model: string;
    tone: Tone;
    onStream?: (chunk: string) => void;
}

const TONE_PROMPTS: Record<Tone, string> = {
    casual: "You are a translator that converts Chinese text into authentic, casual, and punchy American English slang/Gen Z slang. Use internet abbreviations (like 'rn', 'fr', 'ngl') where natural. Output ONLY the translated text. No explanations.",
    neutral: "You are a translator that converts Chinese text into authentic, everyday American English. Speak like a normal millennial—casual but polite, standard capitalization, no excessive slang. Output ONLY the translated text.",
    formal: "You are a translator that converts Chinese text into professional, clear, and concise American English. Suitable for workplace communication. Output ONLY the translated text."
};

export const fetchModels = async (provider: APIProvider, apiKey: string): Promise<string[]> => {
    if (!apiKey) return [];

    try {
        if (provider === 'gemini') {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            if (data.models) {
                return data.models
                    .map((m: any) => m.name.replace('models/', ''))
                    .filter((name: string) => name.includes('gemini'));
            }
            return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        } else {
            const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
            const list = await openai.models.list();
            return list.data
                .filter(m => m.id.includes('gpt'))
                .map(m => m.id)
                .sort();
        }
    } catch (error) {
        console.error("Error fetching models:", error);
        if (provider === 'gemini') return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o'];
    }
};

export const translateToSlang = async ({ text, apiKey, provider, model, tone, onStream }: TranslateOptions): Promise<string> => {
    if (!apiKey) throw new Error('API Key is missing');

    const systemPrompt = TONE_PROMPTS[tone] || TONE_PROMPTS['neutral'];

    if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model: model || "gemini-1.5-flash" });

        const result = await geminiModel.generateContentStream(`${systemPrompt}\n\nHuman: ${text}\nTranslator:`);

        let fullText = '';
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                fullText += chunkText;
                onStream?.(chunkText);
            }
        }
        return fullText;

    } else {
        // OpenAI
        const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text }
            ],
            model: model || "gpt-3.5-turbo",
            stream: true,
        });

        let fullText = '';
        for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullText += content;
                onStream?.(content);
            }
        }
        return fullText;
    }
};
