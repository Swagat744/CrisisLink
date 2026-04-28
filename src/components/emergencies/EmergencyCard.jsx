// src/components/emergencies/EmergencyCard.jsx
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Flame, HeartPulse, Shield, ChevronRight, User, MapPin, Clock } from 'lucide-react';

const TYPE_ICONS = {
  Fire: Flame,
  Medical: HeartPulse,
  Security: Shield,
};

const TYPE_COLORS = {
  Fire: 'text-red-400',
  Medical: 'text-blue-400',
  Security: 'text-amber-400',
};

const TYPE_BG = {
  Fire: 'bg-red-500/10 border-red-500/30',
  Medical: 'bg-blue-500/10 border-blue-500/30',
  Security: 'bg-amber-500/10 border-amber-500/30',
};

function StatusBadge({ status }) {
  const map = {
    New: 'status-new',
    Assigned: 'status-assigned',
    'On the Way': 'status-ontheway',
    Resolved: 'status-resolved',
    Escalated: 'status-escalated',
  };
  return <span className={map[status] || 'status-new'}>{status}</span>;
}

function SeverityBadge({ severity }) {
  const map = {
    Low: 'severity-low',
    Medium: 'severity-medium',
    High: 'severity-high',
    Critical: 'severity-critical',
  };
  return <span className={map[severity] || 'severity-low'}>{severity}</span>;
}

export default function EmergencyCard({ emergency }) {
  const Icon = TYPE_ICONS[emergency.type] || Shield;
  const colorClass = TYPE_COLORS[emergency.type] || 'text-slate-400';
  const bgClass = TYPE_BG[emergency.type] || 'bg-slate-700/30 border-slate-600/30';
  const typeClass = `type-${emergency.type?.toLowerCase()}`;

  const createdAt = emergency.createdAt?.toDate
    ? emergency.createdAt.toDate()
    : new Date();

  return (
    <Link
      to={`/emergency/${emergency.id}`}
      className={`card ${typeClass} ${bgClass} block hover:border-slate-500 transition-colors`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 bg-slate-800`}>
            <Icon size={18} className={colorClass} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`font-semibold text-base ${colorClass}`}>{emergency.type}</span>
              <SeverityBadge severity={emergency.severity} />
              <StatusBadge status={emergency.status} />
            </div>

            <div className="flex items-center gap-1 text-slate-300 text-sm mb-1">
              <MapPin size={13} className="text-slate-500 flex-shrink-0" />
              <span className="truncate">{emergency.locationName}</span>
              {emergency.floor && (
                <span className="text-slate-500">· {emergency.floor}</span>
              )}
            </div>

            {emergency.message && (
              <p className="text-slate-400 text-sm truncate mb-2">{emergency.message}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </span>
              {emergency.assignedStaffName && (
                <span className="flex items-center gap-1">
                  <User size={11} />
                  {emergency.assignedStaffName}
                </span>
              )}
            </div>
          </div>
        </div>

        <ChevronRight size={18} className="text-slate-600 flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}

export { StatusBadge, SeverityBadge };
