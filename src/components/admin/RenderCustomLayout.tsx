interface LayoutConfig {
  orientation: 'portrait' | 'landscape';
  canvas_width: number;
  canvas_height: number;
  elements: {
    [key: string]: {
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize?: number;
      fontFamily?: string;
      fontWeight?: number;
      color?: string;
      textAlign?: string;
      visible: boolean;
      zIndex: number;
      borderRadius?: string;
      borderWidth?: number;
      borderColor?: string;
    };
  };
}

interface Call {
  model_name: string;
  model_photo?: string;
  room?: string;
  called_at: string;
}

interface RenderCustomLayoutProps {
  config: LayoutConfig;
  currentCall: Call | null;
}

export function RenderCustomLayout({ config, currentCall }: RenderCustomLayoutProps) {
  if (!currentCall) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-white/60 text-2xl">Aguardando chamadas...</p>
      </div>
    );
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const containerStyle = {
    width: config.orientation === 'portrait' ? '100vh' : '100vw',
    height: config.orientation === 'portrait' ? '100vw' : '100vh',
    transform: config.orientation === 'portrait' ? 'rotate(90deg)' : 'none',
    transformOrigin: config.orientation === 'portrait' ? 'center center' : 'none',
  };

  return (
    <div 
      className="relative overflow-hidden bg-gradient-to-br from-studio-dark via-background to-studio-dark"
      style={containerStyle}
    >
      {/* Model Name */}
      {config.elements.modelName?.visible && (
        <div
          style={{
            position: 'absolute',
            left: config.elements.modelName.x,
            top: config.elements.modelName.y,
            width: config.elements.modelName.width,
            height: config.elements.modelName.height,
            fontSize: config.elements.modelName.fontSize,
            fontFamily: config.elements.modelName.fontFamily,
            fontWeight: config.elements.modelName.fontWeight,
            color: config.elements.modelName.color,
            textAlign: config.elements.modelName.textAlign as any,
            zIndex: config.elements.modelName.zIndex,
            display: 'flex',
            alignItems: 'center',
            justifyContent: config.elements.modelName.textAlign === 'center' ? 'center' : 
                           config.elements.modelName.textAlign === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          {currentCall.model_name}
        </div>
      )}

      {/* Model Photo */}
      {config.elements.modelPhoto?.visible && currentCall.model_photo && (
        <img
          src={currentCall.model_photo}
          alt={currentCall.model_name}
          style={{
            position: 'absolute',
            left: config.elements.modelPhoto.x,
            top: config.elements.modelPhoto.y,
            width: config.elements.modelPhoto.width,
            height: config.elements.modelPhoto.height,
            borderRadius: config.elements.modelPhoto.borderRadius,
            border: `${config.elements.modelPhoto.borderWidth}px solid ${config.elements.modelPhoto.borderColor}`,
            zIndex: config.elements.modelPhoto.zIndex,
            objectFit: 'cover',
          }}
        />
      )}

      {/* Room */}
      {config.elements.room?.visible && currentCall.room && (
        <div
          style={{
            position: 'absolute',
            left: config.elements.room.x,
            top: config.elements.room.y,
            width: config.elements.room.width,
            height: config.elements.room.height,
            fontSize: config.elements.room.fontSize,
            fontFamily: config.elements.room.fontFamily,
            fontWeight: config.elements.room.fontWeight,
            color: config.elements.room.color,
            textAlign: config.elements.room.textAlign as any,
            zIndex: config.elements.room.zIndex,
            display: 'flex',
            alignItems: 'center',
            justifyContent: config.elements.room.textAlign === 'center' ? 'center' : 
                           config.elements.room.textAlign === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          Sala {currentCall.room}
        </div>
      )}

      {/* Current Time */}
      {config.elements.time?.visible && (
        <div
          style={{
            position: 'absolute',
            left: config.elements.time.x,
            top: config.elements.time.y,
            width: config.elements.time.width,
            height: config.elements.time.height,
            fontSize: config.elements.time.fontSize,
            fontFamily: config.elements.time.fontFamily,
            fontWeight: config.elements.time.fontWeight,
            color: config.elements.time.color,
            zIndex: config.elements.time.zIndex,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {getCurrentTime()}
        </div>
      )}

      {/* Called At */}
      {config.elements.calledAt?.visible && (
        <div
          style={{
            position: 'absolute',
            left: config.elements.calledAt.x,
            top: config.elements.calledAt.y,
            width: config.elements.calledAt.width,
            height: config.elements.calledAt.height,
            fontSize: config.elements.calledAt.fontSize,
            fontFamily: config.elements.calledAt.fontFamily,
            fontWeight: config.elements.calledAt.fontWeight,
            color: config.elements.calledAt.color,
            textAlign: config.elements.calledAt.textAlign as any,
            zIndex: config.elements.calledAt.zIndex,
            display: 'flex',
            alignItems: 'center',
            justifyContent: config.elements.calledAt.textAlign === 'center' ? 'center' : 
                           config.elements.calledAt.textAlign === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          Chamado às {formatTime(currentCall.called_at)}
        </div>
      )}
    </div>
  );
}
