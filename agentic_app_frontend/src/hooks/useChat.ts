import { useState, useCallback } from 'react';
import type { Message } from '../types/chat';
import { sengMessageToLLM } from '../api/chat.api';


export const useChat = () => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const sendMessage = useCallback(async (text: string) => {
		if (!text.trim()) return;

		const userMessage: Message = {
			id: Date.now(),
			message: text,
			sender: 'user',
		};

		setMessages((prev) => [...prev, userMessage]);
		setLoading(true);
		setError(null);

		try {
			// Simulate network delay
			const response = await sengMessageToLLM(text);

			const botMessage: Message = {
				id: (Date.now() + 1),
				message: response.reply,
				sender: 'bot',
				// modelName: response?.modelName,
			};

			setMessages((prev) => [...prev, botMessage]);
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("Unexpected error occured");
			}
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, []);

	return {
		messages,
		loading,
		error,
		sendMessage,
	};
};
