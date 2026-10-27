import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import React from 'react';
import styles from './work.module.css';

export default function InternalDocsHome() {
  return (
    <Layout title="Project docs" description="Project work, task documents and Git history">
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1>Project docs</h1>
            <p>Browse the project’s committed work documents, implementation history and references.</p>
          </div>
        </header>
        <div className={styles.workGrid}>
          <article className={styles.card}>
            <h2><Link to="/work/">Work dashboard</Link></h2>
            <p>View current Epics, Stories, Tasks, linked Git commits and recent repository history.</p>
          </article>
          <article className={styles.card}>
            <h2><Link to="/guides/docs/planning/workflow/">MVP planning</Link></h2>
            <p>Turn plain-language MVP requests into branch-ready Epics, then expand selected work.</p>
          </article>
          <article className={styles.card}>
            <h2><Link to="/guides/docs/reference/">Reference docs</Link></h2>
            <p>Browse project architecture, setup guides and historical task records.</p>
          </article>
        </div>
      </main>
    </Layout>
  );
}
