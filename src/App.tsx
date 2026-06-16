import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal as TerminalIcon, Send, RefreshCw, AlertCircle, Cpu, Radio } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { streamText } from 'ai';
import { geminiModel } from './services/geminiService';

interface LocalMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: LocalMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const { textStream } = streamText({
        model: geminiModel,
        system: "You are Lumina AI Terminal, a precise and technical specialist assistant. Your responses should be concise, professional, and formatted for a technical terminal interface. Use markdown where appropriate.",
        messages: newMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
      });

      let fullContent = '';
      
      // Initialize model message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      for await (const textPart of textStream) {
        fullContent += textPart;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: fullContent };
          }
          return updated;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setMessages(prev => prev.filter(msg => msg.content !== '' || msg.role !== 'assistant'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 md:p-8 bg-hw-bg text-hw-text">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl bg-hw-card rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-hw-border flex flex-col overflow-hidden h-[90vh] relative"
        id="main-terminal"
      >
        {/* Terminal Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-hw-border bg-hw-card z-10">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded bg-hw-accent flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-hw-accent/20">
              L
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">Lumina Terminal</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">v3.0.1</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-hw-accent animate-pulse' : 'bg-hw-success'}`} />
                <span className="text-[9px] text-hw-secondary font-mono tracking-wider uppercase">
                  {isLoading ? 'Processing...' : 'API Online'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-hw-secondary font-bold uppercase tracking-tighter">Throughput</span>
                <div className="w-32 h-1 bg-hw-border rounded-full overflow-hidden mt-1.5">
                  <motion.div 
                    animate={{ width: isLoading ? '70%' : '12%' }}
                    className="h-full bg-hw-accent"
                  />
                </div>
              </div>
              <div className="h-6 w-[1px] bg-hw-border" />
            </div>
            <button 
              onClick={() => setMessages([])}
              className="p-2 text-hw-secondary hover:text-hw-text transition-colors"
              title="Clear Terminal"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar (Visual only for theme depth) */}
          <aside className="hidden md:flex w-56 border-r border-hw-border flex-col bg-hw-card/50">
            <div className="p-4 py-6 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-hw-secondary font-bold mb-4 px-2">Operational Logs</span>
              <div className="flex items-center gap-3 px-3 py-2 bg-hw-accent/10 rounded border border-hw-accent/20 text-[11px] text-hw-accent font-medium">
                <Radio className="w-3 h-3" /> <span>Real-time Link</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-hw-secondary hover:bg-hw-border/30 rounded text-[11px] transition-colors cursor-default">
                <Cpu className="w-3 h-3" /> <span>NPU Cluster 01</span>
              </div>
            </div>
            <div className="mt-auto p-4 border-t border-hw-border">
              <div className="p-3 rounded bg-hw-panel border border-hw-border">
                <p className="text-[9px] text-hw-secondary mb-2 uppercase font-bold tracking-widest">Session TTL</p>
                <div className="w-full h-1 bg-hw-border rounded-full overflow-hidden">
                  <div className="w-4/5 h-full bg-hw-accent/50"></div>
                </div>
              </div>
            </div>
          </aside>

          {/* Chat Section */}
          <section className="flex-1 flex flex-col bg-hw-panel/30">
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-12 terminal-scroll"
            >
              <AnimatePresence mode="popLayout">
                {messages.length === 0 && !isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center opacity-30 select-none"
                  >
                    <TerminalIcon className="w-12 h-12 mb-4 text-hw-secondary" />
                    <p className="font-mono text-[11px] uppercase tracking-[0.3em]">Command Interface Ready</p>
                    <p className="text-[10px] mt-2 max-w-[200px]">System is awaiting structural query input via established uplink.</p>
                  </motion.div>
                )}

                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${msg.role === 'user' ? 'text-blue-400 bg-blue-400/10' : 'text-hw-accent bg-hw-accent/10'}`}>
                        {msg.role === 'user' ? 'POST' : 'RESPONSE'}
                      </span>
                      <span className="text-[10px] text-hw-secondary font-mono">
                        {msg.role === 'user' ? '/v1/user/input' : '/v1/ai/generate'}
                      </span>
                      <div className="h-[1px] flex-1 bg-hw-border/50" />
                    </div>
                    
                    <div className={`p-5 rounded-lg border border-hw-border ${msg.role === 'user' ? 'bg-hw-card' : 'bg-transparent'} relative overflow-hidden group`}>
                      {msg.role === 'user' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/50" />}
                      <div className={`prose prose-invert prose-sm max-w-none font-sans leading-relaxed ${msg.role !== 'user' ? 'text-hw-text' : 'text-hw-text/80'} markdown-body`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <div className="flex items-center gap-4 text-hw-accent animate-pulse font-mono text-[10px] uppercase tracking-widest px-1">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-hw-accent rounded-full" />
                    <div className="w-1 h-1 bg-hw-accent rounded-full" />
                    <div className="w-1 h-1 bg-hw-accent rounded-full" />
                  </div>
                  Analyzing stream data...
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-[11px] font-mono uppercase font-bold tracking-tight">{error}</p>
                </div>
              )}
            </div>

            {/* Response Indicator Bar (like footer info in theme) */}
            <div className="h-10 border-y border-hw-border bg-hw-card/50 flex items-center justify-between px-6 text-[9px] text-hw-secondary font-mono tracking-tight cursor-default select-none">
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-hw-success rounded-full" /> Connection Established</span>
                <span className="opacity-50">|</span>
                <span>Region: Europe-West</span>
              </div>
              <div className="flex gap-4">
                <span>Tokens: {isLoading ? '--' : Math.floor(Math.random() * 100) + 50} In</span>
                <span>JSON</span>
                <span className="text-hw-accent font-bold">Secure SSL</span>
              </div>
            </div>

            {/* Input Form */}
            <div className="p-6 bg-hw-card">
              <form 
                onSubmit={handleSubmit}
                className="flex items-center gap-3 bg-hw-panel border border-hw-border rounded-lg p-1.5 pl-4 focus-within:ring-1 ring-hw-accent/30 transition-all shadow-inner"
              >
                <span className="text-hw-accent font-mono text-sm font-bold opacity-50 select-none">$</span>
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter analytical command..."
                  className="flex-1 bg-transparent border-none outline-none text-hw-text font-mono text-sm placeholder:text-hw-secondary/30"
                  disabled={isLoading}
                  autoFocus
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-hw-accent hover:bg-hw-accent/90 disabled:opacity-20 disabled:hover:bg-hw-accent text-white text-xs font-bold px-6 py-2 rounded shadow-lg shadow-hw-accent/10 transition-all flex items-center gap-2"
                >
                  <span className="hidden sm:inline">Transmit</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
