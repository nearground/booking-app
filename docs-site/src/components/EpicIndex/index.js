import Link from '@docusaurus/Link';
import { usePluginData } from '@docusaurus/useGlobalData';
import React from 'react';
import styles from './styles.module.css';

const STATUS_ORDER = ['in-progress', 'blocked', 'ready', 'draft', 'done', 'cancelled'];

// Wave = 1 + deepest dependency wave, so Epics with no dependencies start in wave 1.
function computeWaves(epics) {
  const byId = new Map(epics.map((epic) => [epic.id, epic]));
  const waves = new Map();
  const visit = (id, trail = new Set()) => {
    if (waves.has(id)) return waves.get(id);
    if (trail.has(id) || !byId.has(id)) return 0;
    trail.add(id);
    const wave = 1 + Math.max(0, ...byId.get(id).dependsOn.map((dep) => visit(dep, trail)));
    waves.set(id, wave);
    return wave;
  };
  epics.forEach((epic) => visit(epic.id));
  return waves;
}

function StatusBadge({ status }) {
  return <span className={`${styles.badge} ${styles[status] || ''}`}>{status}</span>;
}

export default function EpicIndex() {
  const { workItems = [] } = usePluginData('work-docs');
  const epics = workItems.filter((item) => item.type === 'epic');
  if (!epics.length) return <p>No Epics have been planned yet.</p>;

  const byId = new Map(epics.map((epic) => [epic.id, epic]));
  const waves = computeWaves(epics);
  const childCount = (epic, type) => workItems
    .filter((item) => item.type === type && item.id.startsWith(`${epic.id}/`)).length;
  const sorted = [...epics]
    .sort((a, b) => (waves.get(a.id) - waves.get(b.id)) || a.title.localeCompare(b.title));

  const statusCounts = STATUS_ORDER
    .map((status) => [status, epics.filter((epic) => epic.status === status).length])
    .filter(([, count]) => count > 0);
  const stats = [
    ['Epics', epics.length],
    ['Stories', workItems.filter((item) => item.type === 'story').length],
    ['Tasks', workItems.filter((item) => item.type === 'task').length],
    ['Delivery waves', Math.max(0, ...Array.from(waves.values()))],
  ];

  return (
    <>
      <div className={styles.stats}>
        {stats.map(([label, value]) => (
          <div key={label} className={styles.stat}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className={styles.statusSummary}>
        {statusCounts.map(([status, count]) => (
          <span key={status}><StatusBadge status={status} /> {count}</span>
        ))}
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Wave</th>
            <th>Epic</th>
            <th>Status</th>
            <th>Stories / Tasks</th>
            <th>Depends on</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((epic) => (
            <tr key={epic.id}>
              <td>{waves.get(epic.id)}</td>
              <td>
                <Link to={epic.route}>{epic.title}</Link>
                <div className={styles.meta}><code>{epic.id}</code> · <code>{epic.branch}</code></div>
              </td>
              <td><StatusBadge status={epic.status} /></td>
              <td>{childCount(epic, 'story')} / {childCount(epic, 'task')}</td>
              <td>
                {epic.dependsOn.length === 0 ? <span className={styles.meta}>None</span> : (
                <ul className={styles.deps}>
                  {epic.dependsOn.map((dep) => (
                    <li key={dep}>
                      {byId.has(dep)
                        ? <Link to={byId.get(dep).route}>{byId.get(dep).title}</Link>
                        : <code>{dep}</code>}
                    </li>
                  ))}
                </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
