import React from 'react';
import { Button } from 'react-bootstrap';

const CollageMobileControls = ({
  selectedId,
  activeButtonId,
  startContinuousAction,
  stopContinuousAction,
  moveImageByStep,
  resizeImageByStep,
}) => {
  if (!selectedId) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '5px', justifyContent: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
      <Button
        variant="outline-secondary"
        onMouseDown={() => startContinuousAction('moveUp', moveImageByStep, 0, -5)}
        onMouseUp={stopContinuousAction}
        onMouseLeave={stopContinuousAction}
        onTouchStart={() => startContinuousAction('moveUp', moveImageByStep, 0, -5)}
        onTouchEnd={stopContinuousAction}
        style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'moveUp' ? 'var(--control-active-bg)' : undefined }}
      >
        ⬆️
      </Button>
      <Button
        variant="outline-secondary"
        onMouseDown={() => startContinuousAction('moveLeft', moveImageByStep, -5, 0)}
        onMouseUp={stopContinuousAction}
        onMouseLeave={stopContinuousAction}
        onTouchStart={() => startContinuousAction('moveLeft', moveImageByStep, -5, 0)}
        onTouchEnd={stopContinuousAction}
        style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'moveLeft' ? 'var(--control-active-bg)' : undefined }}
      >
        ⬅️
      </Button>
      <Button
        variant="outline-secondary"
        onMouseDown={() => startContinuousAction('moveRight', moveImageByStep, 5, 0)}
        onMouseUp={stopContinuousAction}
        onMouseLeave={stopContinuousAction}
        onTouchStart={() => startContinuousAction('moveRight', moveImageByStep, 5, 0)}
        onTouchEnd={stopContinuousAction}
        style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'moveRight' ? 'var(--control-active-bg)' : undefined }}
      >
        ➡️
      </Button>
      <Button
        variant="outline-secondary"
        onMouseDown={() => startContinuousAction('moveDown', moveImageByStep, 0, 5)}
        onMouseUp={stopContinuousAction}
        onMouseLeave={stopContinuousAction}
        onTouchStart={() => startContinuousAction('moveDown', moveImageByStep, 0, 5)}
        onTouchEnd={stopContinuousAction}
        style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'moveDown' ? 'var(--control-active-bg)' : undefined }}
      >
        ⬇️
      </Button>
      <Button
        variant="outline-secondary"
        onMouseDown={() => startContinuousAction('zoomOut', resizeImageByStep, -5)}
        onMouseUp={stopContinuousAction}
        onMouseLeave={stopContinuousAction}
        onTouchStart={() => startContinuousAction('zoomOut', resizeImageByStep, -5)}
        onTouchEnd={stopContinuousAction}
        style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'zoomOut' ? 'var(--control-active-bg)' : undefined }}
      >
        ➖
      </Button>
      <Button
        variant="outline-secondary"
        onMouseDown={() => startContinuousAction('zoomIn', resizeImageByStep, 5)}
        onMouseUp={stopContinuousAction}
        onMouseLeave={stopContinuousAction}
        onTouchStart={() => startContinuousAction('zoomIn', resizeImageByStep, 5)}
        onTouchEnd={stopContinuousAction}
        style={{ width: '60px', height: '40px', touchAction: 'manipulation', backgroundColor: activeButtonId === 'zoomIn' ? 'var(--control-active-bg)' : undefined }}
      >
        ➕
      </Button>
    </div>
  );
};

export default CollageMobileControls;
