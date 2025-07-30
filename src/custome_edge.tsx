import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useReactFlow,
  MarkerType,
} from '@xyflow/react';



export default function CustomEdge({ id, sourceX, sourceY, targetX, targetY }) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#4A90E2',
          strokeWidth: 2,
          strokeDasharray: '5,5',
          animation: 'dash-animation 2s linear infinite',
        }}
        markerEnd={{
          type: MarkerType.ArrowClosed,
          color: '#4A90E2',
        }}
        className="custom-edge"
      />
      <EdgeLabelRenderer>
        <button
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            backgroundColor: '#FF6F61',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}
          className="nodrag nopan"
          onClick={() => {
            setEdges((es) => es.filter((e) => e.id !== id));
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#FF3B30';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#FF6F61';
          }}
        >
          x
        </button>
      </EdgeLabelRenderer>
      <style>
        {`
          @keyframes dash-animation {
            to {
              stroke-dashoffset: -100;
            }
          }
        `}
      </style>
    </>
  );
}