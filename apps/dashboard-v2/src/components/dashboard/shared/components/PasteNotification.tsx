import { useEffect, useState } from 'react';

interface PasteNotificationProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

export function PasteNotification({ show, message, onClose }: PasteNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      {message}
    </div>
  );
}
