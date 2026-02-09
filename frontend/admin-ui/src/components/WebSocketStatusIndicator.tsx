import React, { useEffect, useState } from 'react';
import { webSocketManager } from '@/lib/websocketManager';

type Status = 'connected' | 'connecting' | 'disconnected' | 'error';

export default function WebSocketStatusIndicator() {
  const [status, setStatus] = useState<Status>(
    webSocketManager.getConnectionStatus(),
  );

  useEffect(() => {
    const updateStatus = () => {
      setStatus(webSocketManager.getConnectionStatus());
    };

    const interval = setInterval(updateStatus, 1000);
    const unsubscribeConnect = webSocketManager.onConnect(updateStatus);
    const unsubscribeDisconnect = webSocketManager.onDisconnect(updateStatus);
    updateStatus();

    return () => {
      clearInterval(interval);
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, []);

  const statusText = webSocketManager.getConnectionStatusMessage();
  const iconClass =
    status === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-circle';
  const colorClass =
    status === 'connected'
      ? 'text-success'
      : status === 'connecting'
        ? 'text-warning'
        : status === 'error'
          ? 'text-danger'
          : 'text-secondary';

  const showRetry = status === 'error' || status === 'disconnected';

  return (
    <li className="nav-item" id="websocketStatusIndicator">
      <div className="nav-link" style={{ cursor: 'default' }}>
        <i className={`${iconClass} ${colorClass}`} style={{ fontSize: '0.6rem', marginRight: '4px' }} />
        <span className={colorClass}>{statusText}</span>
        {showRetry && (
          <button
            id="wsRetryBtn"
            className="btn btn-sm btn-link p-0 ml-2"
            style={{ color: 'inherit', textDecoration: 'none' }}
            title="Retry connection"
            onClick={(event) => {
              event.preventDefault();
              webSocketManager.connect();
            }}
          >
            <i className="fas fa-sync-alt" />
          </button>
        )}
      </div>
    </li>
  );
}
