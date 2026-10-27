import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import React, { useCallback, useEffect, useState } from 'react';
import styles from './work.module.css';

const endpoint = '/internal/docs/__internal/work-index';
const commitEndpoint = '/internal/docs/__internal/commit/';
const docsUrl = (filePath) => {
  const withoutExtension = filePath.replace(/\.md$/i, '').replace(/\/index$/i, '');
  return `/${withoutExtension.replace(/^docs\//, '')}/`;
};
const formatDate = (date) => new Date(date).toLocaleString();
const dateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function getRecentActivity(commits, workItems, now = new Date()) {
  const firstDay = new Date(now);
  firstDay.setHours(0, 0, 0, 0);
  firstDay.setDate(firstDay.getDate() - 6);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    return {
      key: dateKey(date),
      label: date.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
      linked: 0,
      unlinked: 0,
    };
  });
  const dayCounts = new Map(days.map((day) => [day.key, day]));
  const workItemTitles = new Map(workItems.map((item) => [item.id, item.title]));
  const workItemCounts = new Map();

  commits.forEach((commit) => {
    const date = new Date(commit.date);
    if (Number.isNaN(date.getTime())) return;
    const day = dayCounts.get(dateKey(date));
    if (!day) return;

    const linkedItems = [...new Set(commit.workItems || [])];
    if (linkedItems.length) {
      day.linked += 1;
      linkedItems.forEach((id) => {
        const current = workItemCounts.get(id) || { id, title: workItemTitles.get(id) || id, count: 0 };
        current.count += 1;
        workItemCounts.set(id, current);
      });
    } else {
      day.unlinked += 1;
    }
  });

  return {
    days,
    workItems: [...workItemCounts.values()]
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
      .slice(0, 5),
  };
}

function RecentActivity({ commits, workItems }) {
  const activity = getRecentActivity(commits, workItems);
  const maxDailyCommits = Math.max(1, ...activity.days.map((day) => day.linked + day.unlinked));
  const maxWorkItemCommits = Math.max(1, ...activity.workItems.map((item) => item.count));
  const recentCommitCount = activity.days.reduce((total, day) => total + day.linked + day.unlinked, 0);

  return (
    <section className={styles.activity} aria-labelledby="recent-activity-heading">
      <h2 id="recent-activity-heading">Git activity · last 7 days</h2>
      <p className={styles.muted}>Daily commit volume and the most active linked work items.</p>
      {!recentCommitCount && <p className={styles.muted}>No commits found in the last seven days.</p>}
      <div className={styles.chartGrid}>
        <article className={styles.chartCard} aria-labelledby="daily-commits-heading">
          <h3 id="daily-commits-heading">Commits per day</h3>
          <div className={styles.legend}>
            <span><i className={styles.linkedKey} /> Work-item linked</span>
            <span><i className={styles.unlinkedKey} /> Unlinked</span>
          </div>
          <div className={styles.dailyChart} role="list" aria-label="Daily commit totals, split by work-item attribution">
            {activity.days.map((day) => {
              const total = day.linked + day.unlinked;
              return (
                <div
                  className={styles.dayColumn}
                  key={day.key}
                  role="listitem"
                  aria-label={`${day.label}: ${total} commits, ${day.linked} linked and ${day.unlinked} unlinked`}
                >
                  <span className={styles.barCount}>{total}</span>
                  <div className={styles.barTrack}>
                    <div className={styles.stackedBar} style={{ height: `${(total / maxDailyCommits) * 100}%` }}>
                      {day.linked > 0 && (
                        <span
                          className={styles.linkedBar}
                          style={{ height: `${(day.linked / total) * 100}%` }}
                        />
                      )}
                      {day.unlinked > 0 && (
                        <span
                          className={styles.unlinkedBar}
                          style={{ height: `${(day.unlinked / total) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <span className={styles.dayLabel}>{day.label}</span>
                </div>
              );
            })}
          </div>
        </article>
        <article className={styles.chartCard} aria-labelledby="work-item-activity-heading">
          <h3 id="work-item-activity-heading">Most active work items</h3>
          {!activity.workItems.length && <p className={styles.muted}>No linked commits in the last seven days.</p>}
          <ul className={styles.horizontalChart}>
            {activity.workItems.map((item) => (
              <li key={item.id} aria-label={`${item.title}: ${item.count} commits`}>
                <span className={styles.activityItemTitle} title={item.id}>{item.title}</span>
                <span className={styles.horizontalTrack}>
                  <span className={styles.horizontalBar} style={{ width: `${(item.count / maxWorkItemCommits) * 100}%` }} />
                </span>
                <span className={styles.barCount}>{item.count}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function CommitList({ commits }) {
  const [expanded, setExpanded] = useState({});
  const [files, setFiles] = useState({});

  const toggle = async (commit) => {
    const isOpen = Boolean(expanded[commit.sha]);
    setExpanded((current) => ({ ...current, [commit.sha]: !isOpen }));
    if (isOpen || files[commit.sha]) return;

    const response = await fetch(`${commitEndpoint}${commit.sha}`);
    if (!response.ok) {
      setFiles((current) => ({ ...current, [commit.sha]: { error: 'Could not load changed files.' } }));
      return;
    }
    const details = await response.json();
    setFiles((current) => ({ ...current, [commit.sha]: details }));
  };

  if (!commits.length) return <p className={styles.muted}>No commits explicitly reference this work item.</p>;

  return (
    <ul className={styles.commitList}>
      {commits.map((commit) => (
        <li key={commit.sha}>
          <div className={styles.commitRow}>
            <button type="button" className={styles.commitButton} onClick={() => toggle(commit)}>
              <code>{commit.shortSha}</code> {commit.subject}
            </button>
            <time dateTime={commit.date}>{formatDate(commit.date)}</time>
            {commit.githubUrl && <a href={commit.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>}
          </div>
          {expanded[commit.sha] && (
            <div className={styles.changedFiles}>
              {files[commit.sha]?.error && <p role="alert">{files[commit.sha].error}</p>}
              {!files[commit.sha] && <p>Loading changed files…</p>}
              {files[commit.sha]?.files?.map((file) => <code key={file}>{file}</code>)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function WorkDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Work dashboard request failed (HTTP ${response.status}).`);
      setData(await response.json());
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeItems = (data?.workItems || []).filter((item) => item.type !== 'task' || item.status !== 'done');
  const unlinkedCommits = (data?.commits || []).filter((commit) => commit.workItems.length === 0);

  return (
    <Layout title="Project work" description="Committed project work and Git history">
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1>Project work</h1>
            <p>Committed work documents describe scope and status. Git commits record implementation evidence.</p>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={load}>Refresh from docs + Git</button>
            <Link to="/epics/">Browse work documents</Link>
          </div>
        </header>

        {error && <p className={styles.error} role="alert">{error}</p>}
        {!data && !error && <p>Loading project work…</p>}

        {data && (
          <>
            {!data.git.available && <p className={styles.warning} role="status">{data.git.message}</p>}
            <p className={styles.updated}>Refreshed {formatDate(data.generatedAt)} · {data.commits.length} recent commits</p>

            <RecentActivity commits={data.commits} workItems={data.workItems} />

            <section aria-labelledby="work-items-heading">
              <h2 id="work-items-heading">Epics, stories and tasks</h2>
              {activeItems.length === 0 && <p>No new work documents yet. Start with the <Link to="/planning/workflow/">MVP planning workflow</Link>.</p>}
              <div className={styles.workGrid}>
                {activeItems.map((item) => (
                  <article className={styles.card} key={item.id}>
                    <div className={styles.cardTitle}>
                      <span className={styles.type}>{item.type}</span>
                      <span className={styles.status}>{item.status}</span>
                    </div>
                    <h3><Link to={docsUrl(item.path)}>{item.title}</Link></h3>
                    <code>{item.id}</code>
                    <p>Branch: <code>{item.branch}</code></p>
                    {item.type !== 'task' && item.commits.length > 0 && (
                      <p className={styles.muted}>Includes commits for child work items.</p>
                    )}
                    <CommitList commits={item.commits} />
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="commits-heading">
              <h2 id="commits-heading">Recent Git commits</h2>
              {!data.commits.length && data.git.available && <p>No commits are available in local Git refs.</p>}
              <CommitList commits={data.commits} />
            </section>

            <section aria-labelledby="unlinked-heading">
              <h2 id="unlinked-heading">Commits without work-item links</h2>
              <p className={styles.muted}>These commits are not attributed to tasks. No association is inferred.</p>
              <CommitList commits={unlinkedCommits.slice(0, 12)} />
            </section>

            <footer className={styles.footer}>
              Task scope/status: committed work documents. Implementation history: Git.
              Add one exact <code>Work-Item: EPIC-slug/STORY-001/TASK-001</code>
              line per Task to a commit message; Story and Epic cards include their Tasks' commits.
              <Link to="/planning/workflow/">Workflow and conventions</Link>
            </footer>
          </>
        )}
      </main>
    </Layout>
  );
}

export default WorkDashboard;
