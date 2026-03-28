# How to run react project in different port
npm run dev

# Prompt
Create a TSX template for a modern, system-adaptive (Light/Dark) chat UI using React and Tailwind CSS. The layout should be a full-screen, single-column chat window with large rounded corners.

Key features:

Use React Functional Components and manage state with a custom hook useChat (handling history, loading, error, message). Use standard JavaScript .map() for lists and conditional rendering (&&).

Automatically detect system preference (prefers-color-scheme).

Light Mode: Clean off-white background (bg-gray-50) with dark text.

Dark Mode: Very dark background (dark:bg-gray-900) with light text.

Implementation: Use Tailwind's dark: prefix for all color-dependent classes.

Header: Include a teal chat icon (bi-chat-dots-fill), a main title "AI Chat", and a subtitle "Your AI assistant". Background should adapt (White in Light mode / Dark Gray in Dark mode).

Chat History:

Display a list of messages from the history state in a scrollable area.

User messages: Right-aligned with a Teal background and white text (consistent in both modes).

Bot messages: Left-aligned. Use bg-gray-200 (Light Mode) or dark:bg-gray-800 (Dark Mode).
Show a pulsing "Bot is typing..." indicator on the left when loading is true, followed by a skeleton text loader.

Display a "Start the conversation" message when history is empty.

Ensure the design works on all device sizes.

Input Form:

A rounded text input field bound to the message state. Input background should adapt (White vs. Dark Gray).

A circular, teal send button with a paper plane icon

The form should be visually and functionally disabled when loading is true.

Note:
Tailwind CSS and Bootstrap Icons are already integrated.

