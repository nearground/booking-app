import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import React from 'react';
import styles from './work.module.css';

const sections = [
  {
    to: '/work/',
    title: 'Dashboard',
    description: 'Current Epics, Stories and Tasks with linked Git commits and recent repository history.',
  },
  {
    to: '/epics/',
    title: 'Epics',
    description: 'Every planned Epic with status, delivery wave, branch and dependencies.',
  },
  {
    to: '/planning/workflow/',
    title: 'Planning workflow',
    description: 'How MVP requests become branch-ready Epics, Stories and Tasks, and how work is tracked.',
  },
  {
    to: '/reference/',
    title: 'Reference',
    description: 'Architecture diagrams, storage contracts and testing notes.',
  },
];

export default function InternalDocsHome() {
  return (
    <Layout title="Internal docs" description="Project planning, work tracking and technical reference">
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1>PV Today internal docs</h1>
            <p>Project planning, work tracking and technical reference for the booking app.</p>
          </div>
        </header>
        <div className={styles.workGrid}>
          {sections.map(({ to, title, description }) => (
            <article className={styles.card} key={to}>
              <h2><Link to={to}>{title}</Link></h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </main>
    </Layout>
  );
}
