import { useState } from "react";

interface ChatInputProps {
  sendMessage: (text: string) => void;
  loading: boolean;
  error: string | null;
}

const ChatInput: React.FC<ChatInputProps> = ({
  sendMessage,
  loading,
  error,
}: ChatInputProps) => {
  const [inputValue, setInputValue] = useState("");


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !loading) {
      sendMessage(inputValue);
      setInputValue("");
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex items-center space-x-2 md:space-x-4"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
          className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 disabled:opacity-50 transition-all duration-300"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-teal-600 hover:bg-teal-600 text-white flex items-center justify-center disabled:bg-teal-600/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <i className="bi bi-send-fill"></i>
        </button>
      </form>

      {error && (
        <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
      )}
    </>
  );
};

export default ChatInput;
