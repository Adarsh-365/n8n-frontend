import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

// Helper function to wrap nodes with a delete button
function NodeWithDelete({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodes, setEdges } = useReactFlow();

  const removeNode = () => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        style={{
          position: 'absolute',
          top: -0,
          right: -0,
          background: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 10,
          height: 10,
          cursor: 'pointer',
          zIndex: 10,
          fontSize: 8,
          paddingLeft: 3,
          paddingBottom: -1,
        }}
        onClick={removeNode}
      >
        x
      </button>
      {children}
    </div>
  );
}

// 1. Custom node component with right handle
export function PromptNode({ id, data }: any) {
  return (
    <div style={{ padding: 10, border: '1px solid #888', borderRadius: 5, background: '#fff' }}>
      <div>{data.label}</div>
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
    </div>
  );
}

// 2. Custom node component with left and right handles
export function ProcessingNode({ id, data }: any) {
  return (
    <NodeWithDelete id={id}>
      <div style={{ padding: 10, border: '1px solid #888', borderRadius: 5, background: '#fff' }}>
        <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
        <div>{data.label}</div>
        <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
      </div>
    </NodeWithDelete>
  );
}

// Agent node: left and right handles (same as ProcessingNode)
export function AgentNode({ id, data }: any) {
  return (
    <NodeWithDelete id={id}>
      <div style={{ padding: 10, border: '1px solid #888', borderRadius: 5, background: '#fff', position: 'relative' }}>
        <Handle type="target" position={Position.Left} id="left" style={{ background: '#555' }} />
        <Handle type="target" position={Position.Bottom} id="bottom1" style={{ left: '35%', background: '#555' }} />
        <Handle type="target" position={Position.Bottom} id="bottom2" style={{ left: '65%', background: '#555' }} />
        <span style={{ position: 'absolute', left: '0%', bottom: -18, fontSize: 12 }}>Memory</span>
        <span style={{ position: 'absolute', left: '75%', bottom: -18, fontSize: 12 }}>LLM</span>
        <div>{data.label}</div>
        <Handle type="source" position={Position.Right} id="right" style={{ background: '#555' }} />
      </div>
    </NodeWithDelete>
  );
}

// 3. Custom node component with left handle
export function OutputNode({ id, data }: any) {
  return (
    <div style={{ padding: 10, border: '1px solid #888', borderRadius: 5, background: '#fff' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      <div>{data.label}</div>
    </div>
  );
}

// Memory node
export function MemoryNode({ id, data }: any) {
  return (
    <NodeWithDelete id={id}>
      <div style={{ padding: 10, border: '1px solid #888', borderRadius: 5, background: '#fff' }}>
        <Handle type="source" position={Position.Top} style={{ background: '#555' }} />
        <div>{data.label}</div>
      </div>
    </NodeWithDelete>
  );
}

// LLM node
export function LLMNode({ id, data }: any) {
  return (
    <NodeWithDelete id={id}>
      <div style={{ padding: 10, border: '1px solid #888', borderRadius: 5, background: '#fff' }}>
        <Handle type="source" position={Position.Top} style={{ background: '#555' }} />
        <Handle type="target" position={Position.Right} style={{ background: '#555' }} />
        <span style={{ position: 'absolute', right: -20, top: 0, fontSize: 12 }}>VD</span>
        <div>{data.label}</div>
      </div>
    </NodeWithDelete>
  );
}

// Vector Database node
export function VDNode({ id, data }: any) {
  return (
    <NodeWithDelete id={id}>
      <div style={{ padding: 10, border: '1px solid #888', borderRadius: 5, background: '#fff' }}>
        <Handle type="source" position={Position.Top} style={{ background: '#555' }} />
        <span style={{ position: 'absolute', right: -90, top: 10, fontSize: 12 }}>Vector Database</span>
        <div>{data.label}</div>
      </div>
    </NodeWithDelete>
  );
}
    
   
  

