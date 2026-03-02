import React from 'react';

const CollageCanvasStage = ({
  containerRef,
  canvasRef,
  isMobile,
  paperSize,
  effectiveScale,
  draggingType,
  handleCanvasMouseDown,
  handlePointerMove,
  handleCanvasMouseUp,
}) => (
  <div
    ref={containerRef}
    style={{
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--surface)',
      borderRadius: '4px',
      overflow: 'auto',
      border: '1px solid var(--border-color)',
      marginTop: isMobile ? '12px' : 0,
      padding: isMobile ? '12px' : '0',
    }}
  >
    <canvas
      ref={canvasRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={(event) => {
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default';
        }
        handleCanvasMouseUp(event);
      }}
      style={{
        width: `${paperSize.width * effectiveScale}px`,
        height: `${paperSize.height * effectiveScale}px`,
        backgroundColor: 'white',
        border: '2px solid var(--border-color)',
        cursor: draggingType === 'rotate' ? 'grab' : draggingType === 'resize' ? 'pointer' : draggingType === 'move' ? 'grabbing' : 'pointer',
        display: 'block',
      }}
    />
  </div>
);

export default CollageCanvasStage;
