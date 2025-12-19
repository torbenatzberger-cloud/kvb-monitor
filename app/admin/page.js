'use client';

import { useState, useEffect } from 'react';

const STATUS_LABELS = {
  open: { label: 'Offen', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' },
  in_progress: { label: 'In Bearbeitung', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' },
  done: { label: 'Erledigt', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' },
  rejected: { label: 'Abgelehnt', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' },
};

const TYPE_LABELS = {
  bug: { label: '🐛 Bug', color: '#ef4444' },
  feature: { label: '✨ Feature', color: '#8b5cf6' },
  feedback: { label: '💬 Feedback', color: '#06b6d4' },
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Auth aus localStorage laden
  useEffect(() => {
    const savedAuth = localStorage.getItem('kvb-admin-auth');
    if (savedAuth) {
      setPassword(savedAuth);
      setIsAuthenticated(true);
    }
  }, []);

  // Tickets laden
  useEffect(() => {
    if (isAuthenticated) {
      loadTickets();
    }
  }, [isAuthenticated, filterStatus]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tickets?status=${filterStatus}`, {
        headers: { 'Authorization': `Bearer ${password}` }
      });

      if (response.status === 401) {
        setError('Falsches Passwort');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setTickets(data.tickets || []);
      setIsAuthenticated(true);
      localStorage.setItem('kvb-admin-auth', password);
    } catch (err) {
      setError('Verbindungsfehler');
    }
    setLoading(false);
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/tickets?status=${filterStatus}`, {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (err) {
      setError('Fehler beim Laden');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    localStorage.removeItem('kvb-admin-auth');
  };

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setEditData({
      status: ticket.status,
      admin_notes: ticket.admin_notes || '',
      resolved_in_version: ticket.resolved_in_version || '',
      send_notification: false,
    });
  };

  const closeTicket = () => {
    setSelectedTicket(null);
    setEditData({});
  };

  const saveTicket = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedTicket.id,
          ...editData,
        }),
      });

      if (response.ok) {
        showNotification('Ticket aktualisiert!', 'success');
        closeTicket();
        loadTickets();
      } else {
        showNotification('Fehler beim Speichern', 'error');
      }
    } catch (err) {
      showNotification('Verbindungsfehler', 'error');
    }
    setSaving(false);
  };

  const deleteTicket = async (id) => {
    if (!confirm('Ticket wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/admin/tickets?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${password}` },
      });

      if (response.ok) {
        showNotification('Ticket gelöscht', 'success');
        loadTickets();
      }
    } catch (err) {
      showNotification('Fehler beim Löschen', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <form onSubmit={handleLogin} style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '40px',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h1 style={{ marginTop: 0, textAlign: 'center', marginBottom: '8px' }}>🔐 Admin</h1>
          <p style={{ textAlign: 'center', opacity: 0.6, marginBottom: '24px' }}>KVB Monitor Ticket-Verwaltung</p>
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin-Passwort"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '16px',
              marginBottom: '16px',
              boxSizing: 'border-box',
            }}
          />
          
          {error && (
            <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '16px' }}>{error}</p>
          )}
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              background: '#e30613',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Prüfe...' : 'Einloggen'}
          </button>
        </form>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          borderRadius: '8px',
          background: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff',
          fontWeight: 500,
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'linear-gradient(90deg, #e30613 0%, #c10510 100%)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px' }}>🎫 Ticket-Verwaltung</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '14px' }}>
            {tickets.length} Ticket{tickets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={loadTickets}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            🔄 Aktualisieren
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Filter */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'open', 'in_progress', 'done', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: filterStatus === status ? '#e30613' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {status === 'all' ? 'Alle' : STATUS_LABELS[status]?.label || status}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Liste */}
      <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>Lädt...</div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>
            Keine Tickets gefunden
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: TYPE_LABELS[ticket.type]?.color || '#666',
                        color: '#fff',
                      }}>
                        {TYPE_LABELS[ticket.type]?.label || ticket.type}
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: STATUS_LABELS[ticket.status]?.bg || 'rgba(255,255,255,0.1)',
                        color: STATUS_LABELS[ticket.status]?.color || '#fff',
                      }}>
                        {STATUS_LABELS[ticket.status]?.label || ticket.status}
                      </span>
                      {ticket.notified_at && (
                        <span style={{ fontSize: '12px', opacity: 0.5 }}>📧 benachrichtigt</span>
                      )}
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>{ticket.title}</h3>
                    <p style={{ margin: 0, opacity: 0.6, fontSize: '13px' }}>
                      {ticket.email} • {formatDate(ticket.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTicket(ticket.id); }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 100,
        }} onClick={closeTicket}>
          <div style={{
            background: '#1a1a2e',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid rgba(255,255,255,0.1)',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: TYPE_LABELS[selectedTicket.type]?.color || '#666',
                  color: '#fff',
                }}>
                  {TYPE_LABELS[selectedTicket.type]?.label}
                </span>
              </div>
              <button onClick={closeTicket} style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
              }}>×</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              <h2 style={{ margin: '0 0 8px' }}>{selectedTicket.title}</h2>
              <p style={{ opacity: 0.6, fontSize: '13px', margin: '0 0 20px' }}>
                Von: {selectedTicket.name || 'Anonym'} ({selectedTicket.email})<br />
                Erstellt: {formatDate(selectedTicket.created_at)}
              </p>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{selectedTicket.description}</p>
              </div>

              {/* Edit Form */}
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', opacity: 0.6, display: 'block', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '14px',
                    }}
                  >
                    <option value="open">Offen</option>
                    <option value="in_progress">In Bearbeitung</option>
                    <option value="done">Erledigt</option>
                    <option value="rejected">Abgelehnt</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', opacity: 0.6, display: 'block', marginBottom: '6px' }}>
                    Gelöst in Version
                  </label>
                  <input
                    type="text"
                    value={editData.resolved_in_version}
                    onChange={(e) => setEditData({ ...editData, resolved_in_version: e.target.value })}
                    placeholder="z.B. 1.5.0"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', opacity: 0.6, display: 'block', marginBottom: '6px' }}>
                    Admin-Notizen (intern)
                  </label>
                  <textarea
                    value={editData.admin_notes}
                    onChange={(e) => setEditData({ ...editData, admin_notes: e.target.value })}
                    placeholder="Interne Notizen..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '14px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {editData.status === 'done' && editData.resolved_in_version && selectedTicket.notify_on_release && !selectedTicket.notified_at && (
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={editData.send_notification}
                      onChange={(e) => setEditData({ ...editData, send_notification: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>📧 Nutzer per E-Mail benachrichtigen</span>
                  </label>
                )}

                {selectedTicket.notified_at && (
                  <p style={{ fontSize: '13px', opacity: 0.6, margin: 0 }}>
                    ✅ Benachrichtigt am {formatDate(selectedTicket.notified_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '20px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={closeTicket}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={saveTicket}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#e30613',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Speichere...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
