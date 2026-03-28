const ChatHeader = () => {
  return (
    <header className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
      <i className="bi bi-chat-dots-fill text-teal-700 dark:text-teal-600  text-3xl md:text-4xl mr-4"></i>
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
          AI Box Chat
        </h1>
        <p className="text-sm md:text-base text-gray-400">Your AI assistant</p>
      </div>
    </header>
  );
};

export default ChatHeader;
