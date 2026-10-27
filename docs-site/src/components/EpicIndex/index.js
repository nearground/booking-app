import Link from '@docusaurus/Link';
import { usePluginData } from '@docusaurus/useGlobalData';
import React from 'react';
import styles from './styles.module.css';

const STATUS_ORDER = ['in-progress', 'blocked', 'ready', 'draft', 'done', 'cancelled'];

function StatusBadge({ status }) {
  return <span className={`${styles.badge} ${styles[status] || ''}`}>{status}</span>;
}

export default function EpicIndex() {
  const { workItems = [] } = usePluginData('work-docs');
  const epics = workItems.filter((item) => item.type === 'epic');
  if (!epics.length) return <p>No Epics have been planned yet.</p>;

  const byId = new Map(epics.map((epic) => [epic.id, epic]));
  const childCount = (epic, type) => workItems
    .filter((item) => item.type === type && item.id.startsWith(`${epic.id}/`)).length;
  const sorted = [...epics]
    .sort((a, b) => (a.wave - b.wave) || a.title.localeCompare(b.title));

  const statusCounts = STATUS_ORDER
    .map((status) => [status, epics.filter((epic) => epic.status === status).length])
    .filter(([, count]) => count > 0);
  const stats = [
    ['Epics', epics.length],
    ['Stories', workItems.filter((item) => item.type === 'story').length],
    ['Tasks', workItems.filter((item) => item.type === 'task').length],
    ['Delivery waves', Math.max(0, ...epics.map((epic) => epic.wave))],
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
              <td>{epic.wave}</td>
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
