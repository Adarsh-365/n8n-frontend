import React, { useCallback, useState, useRef } from 'react';
import ChatbotBar from './ChatbotBar';
import { ReactFlow, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import { PromptNode, ProcessingNode, OutputNode, AgentNode, MemoryNode ,LLMNode,VDNode} from './nodes';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import '@xyflow/react/dist/style.css';
import CustomEdge from './custome_edge';


const initialNodes = [
  { id: 'Prompt_Node', type: 'prompt', position: { x: 0, y: 0 }, data: { label: 'Prompt' } },
  { id: 'Agent_Node', type: 'agent', position: { x: 200, y: 0 }, data: { label: 'Agent_Node' } },
  { id: 'Output', type: 'output', position: { x: 400, y: 0 }, data: { label: 'Output' } },
];
const initialEdges = [];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge({ ...params, type: 'custom-edge' }, eds) // Explicitly set custom edge type
      ),
    [setEdges]
  );

  const nodeTypes = {
    prompt: PromptNode,
    processing: ProcessingNode,
    agent: AgentNode,
    output: OutputNode,
    memory: MemoryNode,
    LLM:LLMNode,
    VD:VDNode,
  };

  const edgeTypes = {
  'custom-edge': CustomEdge,
  };

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Add state for prompt input and processing select
  const [promptValue, setPromptValue] = useState('');
  const [processingOption, setProcessingOption] = useState('option1');
  // Add state for agent prompt template per node
  const [promptTemplateValues, setPromptTemplateValues] = useState<{ [nodeId: string]: string }>({});

  // Add state for Run/Stop
  const [isRunning, setIsRunning] = useState(false);

  // Add state for output from server
  const [outputValue, setOutputValue] = useState('');

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Send to server logic as a function (returns output directly)
  const sendToServer = useCallback(async (prompt?: string) => {
    const metadata: any = {};
    nodes.forEach(node => {
      if (node.type === 'prompt') {
        metadata[node.id] = { prompt: prompt ?? promptValue };
      }
      if (node.type === 'agent') {
        metadata[node.id] = { 
          option: processingOption,
          promptTemplate: promptTemplateValues[node.id] || ''
        };
      }
      // Collect LLM node info for each LLM node
      if (node.type === 'LLM') {
        metadata[node.id] = {
          api: promptTemplateValues[node.id + '_llm_model'] || 'GROQ',
          key: promptTemplateValues[node.id + '_llm_apikey'] || ''
        };
      }
    });

    const combinedData = {
      flow: { nodes, edges },
      metadata,
    };

    const resp = await fetch('https://n8n-backend-one.vercel.app/main', {
      // const resp = await fetch(' http://127.0.0.1:8000/main', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(combinedData),
    });

    let output = '';
    try {
      const responseText = await resp.text();
      let parsed = false;
      // Try to parse as JSON first
      try {
        const jsonResponse = JSON.parse(responseText);
        if (Array.isArray(jsonResponse) && jsonResponse.length > 0 && jsonResponse[0].content) {
          output = jsonResponse[0].content;
          parsed = true;
        } else if (jsonResponse.Output) {
          output = jsonResponse.Output;
          parsed = true;
        }
      } catch (e) {
        // Not JSON, try to parse as AIMessage string
      }
      if (!parsed) {
        // Try to extract content from string like: [AIMessage(content='I am a large language model.', ...)]
        // This regex matches content='...' or content="..." with any character except the closing quote
        const aiMsgMatch = responseText.match(/AIMessage\(content=(['"])(.*?)\1/);
        if (aiMsgMatch && aiMsgMatch[2]) {
          output = aiMsgMatch[2];
        } else {
          output = responseText;
        }
      }
      console.log(output);
    } catch (e) {
      output = 'Error receiving output';
    }
    setOutputValue(output);
    return output;
  }, [nodes, edges, promptValue, processingOption, promptTemplateValues]);

  // Node click handler
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setModalOpen(true);
  }, []);

  // Drag state for modal
  const [modalPos, setModalPos] = useState({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 60 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Mouse event handlers for modal drag
  const onModalMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragOffset({
      x: e.clientX - modalPos.x,
      y: e.clientY - modalPos.y,
    });
    e.preventDefault();
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      setModalPos({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
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

  // Reset modal position when opening
  React.useEffect(() => {
    if (modalOpen) {
      setModalPos({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 60 });
    }
  }, [modalOpen]);

  // Drag and drop handlers for sidebar
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = { x: 200, y: 100 }; // Fixed position

      const newNode = {
        id: `${type}_${+new Date()}`,
        type,
        position,
        data: { label: type.charAt(0).toUpperCase() + type.slice(1) },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Chatbot send handler (fix: use returned output for correct sequence)
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages((msgs) => [...msgs, { role: 'user', content: userMsg }]);
    setPromptValue(userMsg);
    setIsRunning(true);
    const botReply = await sendToServer(userMsg);
    setChatMessages((msgs) => [...msgs, { role: 'bot', content: botReply || '...' }]);
    setChatInput('');
    setIsRunning(false);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Collapsible Sidebar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: sidebarOpen ? 0 : -180,
          width: 180,
          height: '100%',
          background: '#f7f7f7',
          borderLeft: '1px solid #ddd',
          boxShadow: '0 0 8px rgba(0,0,0,0.06)',
          zIndex: 1200,
          transition: 'right 0.2s',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <button
          style={{
            position: 'absolute',
            left: -32,
            top: 20,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: '#2196f3',
            color: '#fff',
            fontWeight: 700,
            fontSize: 18,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            zIndex: 1201,
          }}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {sidebarOpen ? '→' : '←'}
        </button>
        <div style={{ padding: 16, fontWeight: 600, fontSize: 17, borderBottom: '1px solid #eee' }}>
          Add Node
        </div>
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Removed Prompt Node */}
          <div
            style={{
              padding: 10,
              border: '1px solid #888',
              borderRadius: 5,
              background: '#fff',
              cursor: 'grab',
              textAlign: 'center',
              fontWeight: 500,
            }}
            draggable
            onDragStart={(e) => onDragStart(e, 'agent')}
          >
            Agent Node
          </div>

          <div
            style={{
              padding: 10,
              border: '1px solid #888',
              borderRadius: 5,
              background: '#fff',
              cursor: 'grab',
              textAlign: 'center',
              fontWeight: 500,
            }}
            draggable
            onDragStart={(e) => onDragStart(e, 'memory')}
          >
            Memory Node
          </div>

          <div
            style={{
              padding: 10,
              border: '1px solid #888',
              borderRadius: 5,
              background: '#fff',
              cursor: 'grab',
              textAlign: 'center',
              fontWeight: 500,
            }}
            draggable
            onDragStart={(e) => onDragStart(e, 'LLM')}
          >
            LLM Node
          </div>
          
          <div
            style={{
              padding: 10,
              border: '1px solid #888',
              borderRadius: 5,
              background: '#fff',
              cursor: 'grab',
              textAlign: 'center',
              fontWeight: 500,
            }}
            draggable
            onDragStart={(e) => onDragStart(e, 'VD')}
          >
           Vector Database
          </div>
          {/* Removed Output Node */}
        </div>
      </div>
      {/* Run/Stop buttons */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: sidebarOpen ? 210 : 30,
        zIndex: 1100,
        display: 'flex',
        gap: 10,
      }}>
        {/* Run/Stop buttons */}
        <button
          style={{
            padding: '8px 18px',
            borderRadius: 5,
            border: 'none',
            background: isRunning ? '#ccc' : '#4caf50',
            color: '#fff',
            fontWeight: 600,
            fontSize: 16,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            transition: 'background 0.2s',
          }}
          disabled={isRunning}
          onClick={async () => {
            setIsRunning(true);
            await sendToServer();
            setIsRunning(false);
          }}
        >
          Run
        </button>
        <button
          style={{
            padding: '8px 18px',
            borderRadius: 5,
            border: 'none',
            background: isRunning ? '#f44336' : '#ccc',
            color: '#fff',
            fontWeight: 600,
            fontSize: 16,
            cursor: isRunning ? 'pointer' : 'not-allowed',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            transition: 'background 0.2s',
          }}
          disabled={!isRunning}
          onClick={() => setIsRunning(false)}
        >
          Stop
        </button>
      </div>
      <div
        ref={reactFlowWrapper}
        style={{ width: '100%', height: '100%', minHeight: 400 }}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes} // Use custom edge types here
          fitView
          snapToGrid={true}
          snapGrid={[15, 15]}
          onNodeClick={onNodeClick}
          onInit={setReactFlowInstance}
        />
        {/* Modal */}
        {modalOpen && selectedNode && (
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setModalOpen(false)}
          >
            <div
              style={{
                background: '#fff',
                padding: 24,
                borderRadius: 8,
                minWidth: 300,
                minHeight: 120,
                boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
                cursor: dragging ? 'grabbing' : 'default',
                userSelect: 'none',
                // Remove position, left, top for output node
                ...(selectedNode.type !== 'output' && {
                  position: 'absolute',
                  left: modalPos.x,
                  top: modalPos.y,
                }),
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div
                style={{
                  width: '100%',
                  height: 28,
                  cursor: 'grab',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  background: '#f0f0f0',
                  zIndex: 2,
                }}
                onMouseDown={onModalMouseDown}
              />
              <button
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'transparent',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  zIndex: 3,
                }}
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
              <div style={{ marginTop: 28 }}>
                {selectedNode.type === 'prompt' && (
                  <div>
                    <h3>Prompt Node</h3>
                    <input
                      type='text'
                      placeholder='Enter prompt...'
                      value={promptValue}
                      onChange={e => setPromptValue(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        margin: '8px 0',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '16px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <p>This is the Prompt node popup.</p>
                  </div>
                )}
                {selectedNode.type === 'agent' && (
                  <div>
                    <h3>Agent Node</h3>
                    <input
                      type='text'
                      placeholder='Enter prompt...'
                      value={promptTemplateValues[selectedNode.id] || ''}
                      onChange={e =>
                        setPromptTemplateValues(vals => ({
                          ...vals,
                          [selectedNode.id]: e.target.value
                        }))
                      }
                      style={{
                        width: '100%',
                        padding: '8px',
                        margin: '8px 0',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '16px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <select
                      value={processingOption}
                      onChange={e => setProcessingOption(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        margin: '8px 0',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '16px',
                        boxSizing: 'border-box',
                        background: '#fafafa',
                      }}
                    >
                      <option value='option1'>Option 1</option>
                      <option value='option2'>Option 2</option>
                    </select>
                    <p>This is the Processing node popup.</p>
                  </div>
                )}
                {selectedNode.type === 'LLM' && (
                  <div>
                    <h3>LLM Node</h3>
                    <label style={{ display: 'block', margin: '8px 0 4px 0', fontWeight: 500 }}>Model</label>
                    <select
                      value={promptTemplateValues[selectedNode.id + '_llm_model'] || 'GROQ'}
                      onChange={e =>
                        setPromptTemplateValues(vals => ({
                          ...vals,
                          [selectedNode.id + '_llm_model']: e.target.value
                        }))
                      }
                      style={{
                        width: '100%',
                        padding: '8px',
                        margin: '0 0 8px 0',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '16px',
                        boxSizing: 'border-box',
                        background: '#fafafa',
                      }}
                    >
                      <option value='GROQ'>GROQ</option>
                      <option value='GOOGLE'>GOOGLE</option>
                    </select>
                    <label style={{ display: 'block', margin: '8px 0 4px 0', fontWeight: 500 }}>API Key</label>
                    <input
                      type='text'
                      placeholder='Enter API Key...'
                      value={promptTemplateValues[selectedNode.id + '_llm_apikey'] || ''}
                      onChange={e =>
                        setPromptTemplateValues(vals => ({
                          ...vals,
                          [selectedNode.id + '_llm_apikey']: e.target.value
                        }))
                      }
                      style={{
                        width: '100%',
                        padding: '8px',
                        margin: '0 0 8px 0',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '16px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <p>This is the LLM node popup.</p>
                  </div>
                )}
                {selectedNode.type === 'output' && (
                  <div>
                    <h3>Output Node</h3>
                    <p>This is the Output node popup.</p>
                    {outputValue ? (
                      <div
                        style={{
                          marginTop: 12,
                          padding: '12px',
                          background: '#f5f5f5',
                          borderRadius: 6,
                          minHeight: 40,
                          fontSize: 15,
                          color: '#222',
                          fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                          maxHeight: 320,
                          overflowY: 'auto',
                          border: '1px solid #e0e0e0',
                        }}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            code({node, inline, className, children, ...props}) {
                              return !inline ? (
                                <pre style={{background:'#222',color:'#fff',borderRadius:4,padding:'10px',overflowX:'auto'}}>
                                  <code {...props}>{children}</code>
                                </pre>
                              ) : (
                                <code style={{background:'#eee',borderRadius:3,padding:'2px 5px'}} {...props}>{children}</code>
                              );
                            },
                            math({value}) {
                              return <span style={{background:'#e3f2fd',padding:'2px 6px',borderRadius:3}}>{value}</span>;
                            },
                          }}
                        >
                          {outputValue}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span style={{ color: '#aaa' }}>No output yet.</span>
                    )}
                  </div>
                )}
                {selectedNode.type === 'VD' && (
                  <div>
                    <h3>Vector Database Node</h3>
                    <p>Upload documents to the Vector Database node.</p>
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('file', file);

                          try {
                            const response = await fetch('http://127.0.0.1:8000/upload', {
                              method: 'POST',
                              body: formData,
                            });

                            if (response.ok) {
                              const result = await response.json();
                              console.log('File uploaded successfully:', result);
                              alert('File uploaded successfully!');
                            } else {
                              console.error('File upload failed:', response.statusText);
                              alert('File upload failed.');
                            }
                          } catch (error) {
                            console.error('Error uploading file:', error);
                            alert('Error uploading file.');
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        margin: '8px 0',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '16px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* ChatbotBar extracted to its own component */}
      <ChatbotBar
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        isRunning={isRunning}
        handleChatSend={handleChatSend}
        setChatMessages={setChatMessages} // <-- Add this line!
      />
    </div>
  );
}