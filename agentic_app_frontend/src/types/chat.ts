export interface Message {
	id: number;
	message: string;
	sender: 'user' | 'bot';
	modelName?: string;
}

export interface LLMResponse {
	reply: string;
}