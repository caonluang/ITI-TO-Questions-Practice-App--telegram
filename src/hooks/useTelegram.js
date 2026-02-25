import { useEffect, useState } from 'react';

export const useTelegram = () => {
    const [tg, setTg] = useState(null);

    useEffect(() => {
        const telegramInstance = window.Telegram?.WebApp;
        if (telegramInstance) {
            telegramInstance.ready();
            telegramInstance.expand();
            setTg(telegramInstance);

            // Update body classes for theme
            document.body.classList.add(telegramInstance.colorScheme === 'dark' ? 'dark' : 'light');
        }
    }, []);

    const onClose = () => {
        tg?.close();
    };

    const onToggleButton = () => {
        if (tg?.MainButton.isVisible) {
            tg.MainButton.hide();
        } else {
            tg.MainButton.show();
        }
    };

    const showHaptic = (style = 'medium') => {
        tg?.HapticFeedback.impactOccurred(style);
    };

    const showMainButton = (text, onClick) => {
        if (tg) {
            tg.MainButton.text = text;
            tg.MainButton.show();
            tg.onEvent('mainButtonClicked', onClick);
        }
    };

    const hideMainButton = () => {
        tg?.MainButton.hide();
    };

    return {
        tg,
        user: tg?.initDataUnsafe?.user,
        onClose,
        onToggleButton,
        showHaptic,
        showMainButton,
        hideMainButton,
        isDark: tg?.colorScheme === 'dark'
    };
};
