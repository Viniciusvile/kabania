import React, { useState, useEffect, useRef } from 'react';
import {
  X, Calendar, Users, MessageSquare, Sparkles, Send,
  AlertTriangle, Clock, CheckCircle2, Edit2
} from 'lucide-react';
import { getDeadlineStatus } from '../services/notificationService';
import { notifyComment } from '../services/notificationService';
import './CardDetailModal.css';

function getInitials(email) {
  if (!email) return '??';
  return email.substring(0, 2).toUpperCase();
}

function getAvatarColor(email) {
  const colors = ['#00e5ff', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCommentTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function CardDetailModal({ task, currentUser, onClose, onUpdate }) {
  const [commentText, setCommentText] = useState('');
  const commentsEndRef = useRef(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.comments?.length]);

  if (!task) return null;

  const deadlineStatus = getDeadlineStatus(task.deadline);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: `c-${Date.now()}`,
      author: currentUser,
      text: commentText.trim(),
      createdAt: new Date().toISOString()
    };
    const updatedTask = {
      ...task,
      comments: [...(task.comments || []), newComment]
    };
    onUpdate(updatedTask);
    notifyComment(task, currentUser);
    setCommentText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className="cdm-overlay" onClick={onClose}>
      <div className="cdm-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="cdm-header">
          <div className="cdm-title-area">
            <h2>{task.title}</h2>
            {task.tag && (
              <span className="cdm-tag" style={{ color: `var(--color-${task.tagColor}, #00e5ff)` }}>
                {task.tag}
              </span>
            )}
          </div>
          <button className="cdm-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="cdm-body">
          {/* Description */}
          {task.desc && (
            <section className="cdm-section">
              <label>Descrição</label>
              <p className="cdm-desc">{task.desc}</p>
            </section>
          )}

          {/* Deadline + Assignees row */}
          <div className="cdm-meta-row">
            {task.deadline && (
              <div className={`cdm-deadline cdm-deadline-${deadlineStatus?.color || 'green'}`}>
                <Calendar size={14} />
                <span>{formatDate(task.deadline)}</span>
                {deadlineStatus && (
                  <span className="cdm-deadline-badge">{deadlineStatus.icon} {deadlineStatus.label}</span>
                )}
              </div>
            )}

            {task.assignees?.length > 0 && (
              <div className="cdm-assignees">
                <Users size={14} />
                <div className="cdm-avatar-row">
                  {task.assignees.map(email => (
                    <div
                      key={email}
                      className="cdm-avatar"
                      style={{ background: getAvatarColor(email) }}
                      title={email}
                    >
                      {getInitials(email)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Suggestion */}
          {task.aiResponse && (
            <section className="cdm-section">
              <label><Sparkles size={13} /> Sugestão da IA</label>
              <div className="cdm-ai-box">
                {task.isAiLoading
                  ? <span className="cdm-ai-loading"><Sparkles size={12} /> Analisando...</span>
                  : <p>{task.aiResponse}</p>
                }
              </div>
            </section>
          )}

          {/* Comments */}
          <section className="cdm-section cdm-comments-section">
            <label>
              <MessageSquare size={13} />
              Comentários ({task.comments?.length || 0})
            </label>

            <div className="cdm-comments-list">
              {(!task.comments || task.comments.length === 0) && (
                <div className="cdm-no-comments">Nenhum comentário ainda. Seja o primeiro!</div>
              )}
              {task.comments?.map(comment => (
                <div key={comment.id} className={`cdm-comment ${comment.author === currentUser ? 'own' : ''}`}>
                  <div
                    className="cdm-comment-avatar"
                    style={{ background: getAvatarColor(comment.author) }}
                    title={comment.author}
                  >
                    {getInitials(comment.author)}
                  </div>
                  <div className="cdm-comment-content">
                    <div className="cdm-comment-header">
                      <span className="cdm-comment-author">
                        {comment.author === currentUser ? 'Você' : comment.author.split('@')[0]}
                      </span>
                      <span className="cdm-comment-time">{formatCommentTime(comment.createdAt)}</span>
                    </div>
                    <p className="cdm-comment-text">{comment.text}</p>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment Input */}
            <div className="cdm-comment-input-row">
              <div
                className="cdm-comment-input-avatar"
                style={{ background: getAvatarColor(currentUser) }}
              >
                {getInitials(currentUser)}
              </div>
              <div className="cdm-comment-input-wrap">
                <textarea
                  placeholder="Escreva um comentário... (Enter para enviar)"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                />
                <button
                  className="cdm-send-btn"
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
