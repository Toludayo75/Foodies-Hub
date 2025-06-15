import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface MessageFeedbackProps {
  messageId: string;
  onFeedback: (messageId: string, rating: 'helpful' | 'not_helpful') => void;
}

export default function MessageFeedback({ messageId, onFeedback }: MessageFeedbackProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);

  const handleFeedback = (rating: 'helpful' | 'not_helpful') => {
    setFeedback(rating);
    onFeedback(messageId, rating);
  };

  return (
    <div className="flex items-center gap-2 mt-2 opacity-70 hover:opacity-100 transition-opacity">
      <span className="text-xs text-gray-500">Was this helpful?</span>
      <button
        onClick={() => handleFeedback('helpful')}
        className={`p-1 rounded-full transition-colors ${
          feedback === 'helpful' 
            ? 'bg-green-100 text-green-600' 
            : 'hover:bg-gray-100 text-gray-400'
        }`}
        disabled={feedback !== null}
      >
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button
        onClick={() => handleFeedback('not_helpful')}
        className={`p-1 rounded-full transition-colors ${
          feedback === 'not_helpful' 
            ? 'bg-red-100 text-red-600' 
            : 'hover:bg-gray-100 text-gray-400'
        }`}
        disabled={feedback !== null}
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
      {feedback && (
        <span className="text-xs text-gray-500">
          Thank you for your feedback!
        </span>
      )}
    </div>
  );
}