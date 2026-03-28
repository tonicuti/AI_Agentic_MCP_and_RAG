import { useEffect, useRef } from "react";
import type { Message } from "../types/chat";
import "../styles/scrollbar.css";

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  loading,
}: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  return (
    <main className="chatContainer grow p-4 overflow-y-auto scroll-smooth">
      <div className="flex flex-col space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            {/* <i className="bi bi-chat-square-text text-6xl mb-4 opacity-50"></i> */}
            <p className="text-gray-500">
              Start the conversation by typing a message below.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user"
                ? "self-end items-end"
                : "self-start items-start"
                }`}
            >
              <p
                className={`text-xs mb-1 ${msg.sender === "user"
                  ? "text-teal-400 me-3"
                  : "text-gray-400 ms-3"
                  }`}
              >
                {msg.sender === "user"
                  ? "You"
                  : msg.modelName
                    ? msg.modelName
                    : "Toni Bot"}
              </p>
              <div
                className={`max-w-xs md:max-w-md lg:max-w-[85%] px-4 py-3 rounded-2xl ${msg.sender === "user"
                  ? "bg-teal-600 text-white dark:text-gray-100"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  }`}
              >
                <p
                  className={`text-sm ${msg.sender !== "user" ? "whitespace-pre-wrap" : ""
                    }`}
                >
                  {msg?.message}
                </p>
              </div>
            </div>
          ))
        )}
        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-xs md:max-w-md lg:max-w-2xl  animate-pulse">
              <div className="flex items-center">
                <span className="text-xs text-gray-400 ms-3">
                  Bot is typing...
                </span>
                <span className="w-2 h-2 bg-teal-400 rounded-full ml-2 animate-pulse delay-100"></span>
                <span className="w-2 h-2 bg-teal-400 rounded-full ml-1 animate-pulse delay-200"></span>
                <span className="w-2 h-2 bg-teal-400 rounded-full ml-1 animate-pulse delay-300"></span>
              </div>
              {/* Skeleton text */}
              <div className="mt-2 space-y-2 p-3 rounded-2xl bg-gray-200 dark:bg-gray-700">
                <div className="h-2 bg-gray-400 dark:bg-gray-600 rounded w-3/4"></div>
                <div className="h-2 bg-gray-400 dark:bg-gray-600 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </main>
  );
};

export default ChatMessages;
