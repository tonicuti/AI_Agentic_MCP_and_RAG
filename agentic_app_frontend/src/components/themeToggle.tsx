import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    // Kiểm tra trạng thái đã lưu khi web vừa load
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
            setIsDark(true);
            document.documentElement.classList.add('dark'); // Thêm class 'dark' vào thẻ <html>
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    // Hàm xử lý chuyển đổi
    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        }
    };

    return (
        <button
            onClick={toggleTheme}
            // Nút sẽ được ghim cố định ở góc trên bên phải màn hình
            className="fixed top-4 right-4 p-2 md:px-4 md:py-2 rounded-full md:rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-50 flex items-center justify-center font-medium"
            title="Chuyển đổi giao diện"
        >
            <span className="text-xl md:mr-2">{isDark ? '🌙' : '☀️'}</span>
            <span className="hidden md:inline">{isDark ? 'Dark' : 'Light'}</span>
        </button>
    );
}