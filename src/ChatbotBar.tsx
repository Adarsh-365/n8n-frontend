import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
}

interface ChatbotBarProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  isRunning: boolean;
  handleChatSend: () => void;
  setChatMessages?: (msgs: ChatMessage[]) => void; // <-- Add this prop
}

const ChatbotBar: React.FC<ChatbotBarProps> = ({
  chatMessages,
  chatInput,
  setChatInput,
  isRunning,
  handleChatSend,
  setChatMessages, // <-- Add this prop
}) => {
  // Chatbot state for maximize/minimize and position
  const [chatMaximized, setChatMaximized] = useState(false);
  const [minPos, setMinPos] = useState({ x: window.innerWidth / 2 - 260, y: window.innerHeight - 180 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Add state for resizing
  const [size, setSize] = useState({ width: 420, height: 160 });
  const [resizing, setResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 420, height: 160 });

  // Mouse event handlers for minimized bar drag
  const onDragHandleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    setDragOffset({
      x: e.clientX - minPos.x,
      y: e.clientY - minPos.y,
    });
    e.preventDefault();
  };
  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      setMinPos({
        x: Math.max(10, Math.min(window.innerWidth - 540, e.clientX - dragOffset.x)),
        y: Math.max(10, Math.min(window.innerHeight - 140, e.clientY - dragOffset.y)),
      });
    };
    const onMouseUp = () => setDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, dragOffset]);

  // Mouse event handlers for resizing (right side only)
  const onResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
    e.preventDefault();
  };

  useEffect(() => {
    if (!resizing) return;
    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(320, Math.min(600, resizeStart.width + (e.clientX - resizeStart.x)));
      setSize({ width: newWidth, height: size.height }); // Only update width
    };
    const onMouseUp = () => setResizing(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizing, resizeStart, size.height]);

  // Maximized: stack on left side
  if (chatMaximized) {
    return (
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: size.width, // Use dynamic width
          background: 'rgba(255,255,255,0.98)',
          zIndex: 3000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          boxShadow: '2px 0 24px 0 rgba(0,0,0,0.13)',
          borderRight: '1.5px solid #e3e3e3',
          transition: 'all 0.2s',
        }}
      >
        {/* Resize handle at the right side */}
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 8,
            cursor: 'ew-resize',
            zIndex: 10,
            background: 'transparent',
          }}
          title="Resize chat"
        />
        {/* Top bar with Minimize and Clear Chat */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px 0 18px', gap: 8 }}>
          <button
            onClick={() => setChatMaximized(false)}
            style={{
              border: 'none',
              background: '#fbe9e7',
              color: '#d84315',
              borderRadius: 5,
              padding: '4px 16px',
              fontWeight: 600,
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ⬇ Minimize
          </button>
          <button
            onClick={() => setChatMessages && setChatMessages([])}
            style={{
              border: 'none',
              background: '#e3f2fd',
              color: '#1976d2',
              borderRadius: 5,
              padding: '4px 16px',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              marginLeft: 8,
            }}
            disabled={isRunning || chatMessages.length === 0}
            title="Clear chat"
          >
            🗑 Clear Chat
          </button>
        </div>
        {/* Chat history */}
        <div style={{
          maxHeight: '70vh',
          minHeight: 180,
          overflowY: 'auto',
          padding: '16px 24px 0 24px',
          fontSize: 17,
          flex: 1,
          transition: 'max-height 0.2s',
        }}>
          {chatMessages.length === 0 && (
            <div style={{ color: '#aaa', textAlign: 'center', margin: 18, fontSize: 18 }}>Start chatting below...</div>
          )}
          {chatMessages.map((msg, idx) => (
            <div key={idx} style={{
              margin: '10px 0',
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}>
              <span style={{
                display: 'inline-block',
                background: msg.role === 'user' ? '#e3f2fd' : '#f1f8e9',
                color: '#222',
                borderRadius: 8,
                padding: '10px 18px',
                maxWidth: '80%',
                wordBreak: 'break-word',
                fontWeight: msg.role === 'user' ? 500 : 400,
                fontSize: 17,
              }}>
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code: ({ className, children, ...props }) => {
                      const isInline = !className;
                      return !isInline ? (
                        <pre style={{background:'#222',color:'#fff',borderRadius:4,padding:'10px',overflowX:'auto'}}>
                          <code className={className} {...props}>{children}</code>
                        </pre>
                      ) : (
                        <code style={{background:'#eee',borderRadius:3,padding:'2px 5px'}} {...props}>{children}</code>
                      );
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </span>
            </div>
          ))}
        </div>
        {/* Input bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '18px 24px',
          borderTop: '1px solid #eee',
          background: '#fafbfc',
        }}>
          <input
            type='text'
            placeholder='Type your message...'
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !isRunning) handleChatSend();
            }}
            style={{
              flex: 1,
              padding: '14px 18px',
              border: '1px solid #ccc',
              borderRadius: 6,
              fontSize: 18,
              marginRight: 14,
              background: '#fff',
            }}
            disabled={isRunning}
          />
          <button
            onClick={handleChatSend}
            disabled={isRunning || !chatInput.trim()}
            style={{
              padding: '12px 28px',
              borderRadius: 6,
              border: 'none',
              background: isRunning ? '#ccc' : '#1976d2',
              color: '#fff',
              fontWeight: 600,
              fontSize: 18,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              transition: 'background 0.2s',
            }}
          >
            Send
          </button>
        </div>
      </div>
    );
  }
  // Minimized bar (movable, shows last 2 convo = 4 messages)
  // Fix: Ensure bar always fits header, chat, and input, and never hides top/bottom content.
  const minHeaderHeight = 36;
  const minInputBarHeight = 56;
  const minChatHeight = 32;
  const minBarHeight = minHeaderHeight + minInputBarHeight + minChatHeight;
  const minBarStyle = {
    position: 'fixed' as const,
    left: Math.max(0, Math.min(minPos.x, window.innerWidth - size.width)),
    top: Math.max(0, Math.min(minPos.y, window.innerHeight - Math.max(size.height, minBarHeight))),
    minWidth: 320,
    maxWidth: 600,
    width: size.width,
    minHeight: minBarHeight,
    height: Math.max(size.height, minBarHeight),
    background: '#fff',
    border: '1.5px solid #e3e3e3',
    borderRadius: 18,
    boxShadow: '0 6px 32px 0 rgba(0,0,0,0.13)',
    zIndex: 2000,
    display: 'flex',
    flexDirection: 'column' as const,
    transition: 'box-shadow 0.2s',
    overflow: 'hidden',
    cursor: dragging ? 'grabbing' : 'pointer',
    opacity: 0.98,
    userSelect: 'none' as const,
  };
  return (
    <div
      style={minBarStyle}
      tabIndex={0}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 36px 0 rgba(0,0,0,0.18)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 6px 32px 0 rgba(0,0,0,0.13)')}
    >
      {/* Top bar: Drag handle (left), Maximize and Clear Chat (right) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 12px 0 0',
          gap: 8,
          userSelect: 'none',
          minHeight: minHeaderHeight,
          height: minHeaderHeight,
          boxSizing: 'border-box'
        }}
      >
        {/* Drag handle area */}
        <div
          style={{
            width: 32,
            height: 24,
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 8,
            fontSize: 18,
            color: '#bbb',
          }}
          onMouseDown={onDragHandleMouseDown}
          title="Drag to move"
        >
          <span style={{userSelect:'none'}}>≡</span>
        </div>
        {/* Buttons area */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); setChatMaximized(true); }}
            style={{
              border: 'none',
              background: '#e3f2fd',
              color: '#1976d2',
              borderRadius: 5,
              padding: '2px 10px',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(25,118,210,0.07)',
            }}
          >
            ⬆ Maximize
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              setChatMessages && setChatMessages([]);
            }}
            style={{
              border: 'none',
              background: '#fbe9e7',
              color: '#d84315',
              borderRadius: 5,
              padding: '2px 10px',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              marginLeft: 4,
              boxShadow: '0 1px 4px rgba(216,67,21,0.07)',
            }}
            disabled={isRunning || !chatMessages.length}
            title="Clear chat"
          >
            🗑
          </button>
        </div>
      </div>
      {/* Chat history (last 4 messages, 2 convo) */}
      <div
        style={{
          maxHeight: Math.max(size.height, minBarHeight) - minHeaderHeight - minInputBarHeight,
          minHeight: minChatHeight,
          overflowY: 'scroll', // Always show scrollbar
          padding: '2px 20px 0 20px',
          fontSize: 15.5,
          flex: 1, // <-- Make chat history take all available space
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          boxSizing: 'border-box',
          scrollbarWidth: 'thin', // For Firefox
          msOverflowStyle: 'auto', // For IE/Edge
        }}
        className="minimized-chat-scroll"
      >
        {chatMessages.length === 0 && (
          <div style={{ color: '#aaa', textAlign: 'center', margin: 4 }}>Start chatting below...</div>
        )}
        {chatMessages.slice(-4).map((msg, idx) => (
          <div key={idx} style={{
            margin: '2px 0 4px 0',
            textAlign: msg.role === 'user' ? 'right' : 'left',
            width: '100%',
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <span style={{
              display: 'inline-block',
              background: msg.role === 'user' ? '#e3f2fd' : '#f1f8e9',
              color: '#222',
              borderRadius: 12,
              padding: '6px 13px',
              maxWidth: '80%',
              wordBreak: 'break-word',
              fontWeight: msg.role === 'user' ? 500 : 400,
              fontSize: 15.5,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return !isInline ? (
                      <pre style={{background:'#222',color:'#fff',borderRadius:4,padding:'6px',overflowX:'auto', fontSize:13}}>
                        <code className={className} {...props}>{children}</code>
                      </pre>
                    ) : (
                      <code style={{background:'#eee',borderRadius:3,padding:'2px 5px'}} {...props}>{children}</code>
                    );
                  }
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </span>
          </div>
        ))}
      </div>
      {/* Input bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 18px 6px 18px',
        borderTop: '1px solid #f0f0f0',
        background: '#fafbfc',
        // Remove height/minHeight/maxHeight, let content decide height
        flex: 'none', // <-- Prevent input bar from growing/shrinking
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        <input
          type='text'
          placeholder='Type your message...'
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !isRunning) handleChatSend();
          }}
          style={{
            flex: 1,
            padding: '13px 16px',
            border: '1.5px solid #bcdffb',
            borderRadius: 8,
            fontSize: 17,
            marginRight: 12,
            background: '#fff',
            outline: 'none',
            boxShadow: '0 1px 4px rgba(25,118,210,0.04)',
            transition: 'border 0.2s',
          }}
          disabled={isRunning}
        />
        <button
          onClick={handleChatSend}
          disabled={isRunning || !chatInput.trim()}
          style={{
            padding: '10px 22px',
            borderRadius: 8,
            border: 'none',
            background: isRunning ? '#ccc' : '#1976d2',
            color: '#fff',
            fontWeight: 600,
            fontSize: 17,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(25,118,210,0.09)',
            transition: 'background 0.2s',
          }}
        >
          Send
        </button>
        {/* Resize handle at bottom right */}
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            position: 'absolute',
            right: 4,
            bottom: 4,
            width: 18,
            height: 18,
            cursor: 'nwse-resize',
            zIndex: 10,
            background: 'transparent',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            userSelect: 'none',
            pointerEvents: isRunning ? 'none' : 'auto'
          }}
          title="Resize chat"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <polyline points="6,18 18,6" stroke="#bbb" strokeWidth="2" fill="none"/>
            <polyline points="12,18 18,12" stroke="#bbb" strokeWidth="2" fill="none"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

// Custom scrollbar for minimized chat history
const style = document.createElement('style');
style.innerHTML = `
.minimized-chat-scroll::-webkit-scrollbar {
  width: 8px;
  background: #f4f4f4;
}
.minimized-chat-scroll::-webkit-scrollbar-thumb {
  background: #bcdffb;
  border-radius: 6px;
}
.minimized-chat-scroll::-webkit-scrollbar-thumb:hover {
  background: #90caf9;
}
`;
if (typeof window !== 'undefined' && !document.getElementById('minimized-chat-scrollbar-style')) {
  style.id = 'minimized-chat-scrollbar-style';
  document.head.appendChild(style);
}

export default ChatbotBar;
