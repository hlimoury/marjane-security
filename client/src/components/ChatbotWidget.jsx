import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiMessageCircle, FiX, FiSend, FiLoader } from 'react-icons/fi';

const CHATBOT_URL =
  import.meta.env.VITE_CHATBOT_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000' : 'https://marjane-chatbot.onrender.com');

const SUGGESTIONS = [
  'Combien d\'interpellations Client en 2026 ?',
  'Quel rayon a le plus de KDH récupérés ?',
  'Combien de poursuites judiciaires cette année ?',
  'Résumé du dashboard sécurité',
];

const ChatbotWidget = () => {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis l\'assistant Marjane Security. Posez-moi une question sur les interpellations, les totaux ou le dashboard.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  if (!user || !isAdmin()) return null;

  const sendMessage = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const userMsg = { role: 'user', content: question };
    const history = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${CHATBOT_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: question,
          history: history.slice(-10),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Erreur du chatbot');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Erreur: ${err.message}. Vérifiez que le chatbot Python tourne sur ${CHATBOT_URL} et que GROQ_API_KEY est configurée.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-full shadow-lg transition-all"
          title="Assistant Marjane"
        >
          <FiMessageCircle size={22} />
          <span className="text-sm font-medium hidden sm:inline">Assistant</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(100vw-2rem,380px)] h-[min(80vh,520px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <p className="font-semibold text-sm">Assistant Marjane Security</p>
              <p className="text-orange-100 text-xs">Dashboard & interpellations</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-1 hover:bg-orange-600 rounded-lg">
              <FiX size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                  <FiLoader className="animate-spin" size={14} />
                  Analyse en cours...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 2 && (
            <div className="px-3 py-2 border-t bg-white flex flex-wrap gap-1.5 shrink-0">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full hover:bg-orange-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="p-3 border-t bg-white flex gap-2 shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question..."
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white p-2.5 rounded-xl transition-colors"
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
