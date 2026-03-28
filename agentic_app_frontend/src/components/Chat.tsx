import React from "react";
import { useChat } from "../hooks/useChat";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

const Chat: React.FC = () => {
  const { messages, loading, error, sendMessage } = useChat();

  return (
    <div className="h-screen w-screen flex items-center justify-center sm:p-4 font-sans bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-col h-full w-full max-w-2xl sm:max-h-[90%] shadow-2xl overflow-hidden sm:rounded-3xl bg-white dark:bg-gray-800">
        {/* Header */}
        <ChatHeader />

        {/* Chat History */}
        <ChatMessages messages={messages} loading={loading} />

        {/* Footer */}
        <footer className="p-4  border-t border-gray-200 dark:border-gray-700">
          {/* Input Form */}
          <ChatInput sendMessage={sendMessage} loading={loading} error={error} />
        </footer>

      </div>
    </div>
  );
};

export default Chat;
