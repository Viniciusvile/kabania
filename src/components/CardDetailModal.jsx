import React, { useState, useEffect, useRef } from 'react';
import {
  X, Calendar, Users, MessageSquare, Sparkles, Send,
  AlertTriangle, Clock, CheckCircle2, Edit2, Zap
} from 'lucide-react';
import { getDeadlineStatus } from '../services/notificationService';
import { notifyComment } from '../services/notificationService';
import { estimateCard } from '../services/kanbanService';
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

const COMPLEXITY_COLOR = { baixa: '#34d399', média: '#fbbf24', alta: '#f87171' };
const COMPLEXITY_BG   = { baixa: 'rgba(52,211,153,0.08)', média: 'rgba(251,191,36,0.08)', alta: 'rgba(239,68,68,0.08)' };

export default function CardDetailModal({ task, currentUser, onClose, onUpdate }) {
  const [commentText, setCommentText] = useState('');
  const commentsEndRef = useRef(null);
  const [estimation, setEstimation] = useState(null); // { estimate, complexity, reasoning }
  const [estimating, setEstimating] = useState(false);
  const estimatedRef = useRef(false);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.comments?.length]);

  useEffect(() => {
    if (!task?.title || estimatedRef.current) return;
    estimatedRef.current = true;
    setEstimating(true);
    // kanbanService handles localStorage caching (48h TTL) internally
    estimateCard({ title: task.title, description: task.desc || '', taskId: task.id })
      .then(result => setEstimation(result))
      .catch(() => {})
      .finally(() => setEstimating(false));
  }, [task?.id]);

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
            <div className="flex gap-2">
              {task.customer_name && (
                <span className="cdm-tag" style={{ background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff' }}>
                  {task.customer_name}
                </span>
              )}
              {task.tag && (
                <span className="cdm-tag" style={{ color: `var(--color-${task.tagColor}, #00e5ff)` }}>
                  {task.tag}
                </span>
              )}
            </div>
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

          {/* AI Estimation */}
          <section className="cdm-section">
            <label><Zap size={13} /> Estimativa IA</label>
            {estimating && (
              <div className="cdm-ai-box cdm-estimate-loading">
                <Sparkles size={12} className="cdm-spin" /> Estimando esforço...
              </div>
            )}
            {!estimating && estimation && (
              <div className="cdm-estimate-box" style={{ borderColor: COMPLEXITY_COLOR[estimation.complexity] || '#00e5ff', background: COMPLEXITY_BG[estimation.complexity] || 'rgba(0,229,255,0.06)' }}>
                <div className="cdm-estimate-header">
                  <span className="cdm-estimate-value">{estimation.estimate}</span>
                  <span className="cdm-estimate-badge" style={{ color: COMPLEXITY_COLOR[estimation.complexity], background: COMPLEXITY_BG[estimation.complexity] }}>
                    {estimation.complexity}
                  </span>
                </div>
                {estimation.reasoning && (
                  <p className="cdm-estimate-reasoning">{estimation.reasoning}</p>
                )}
              </div>
            )}
            {!estimating && !estimation && (
              <div className="cdm-ai-box">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimativa indisponível</span>
              </div>
            )}
          </section>

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
                        {comment.author === currentUser ? 'Você' : (typeof comment.author === 'string' ? comment.author.split('@')[0] : 'Usuário')}
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
