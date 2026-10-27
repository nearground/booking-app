#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(process.env.WORKSPACE_ROOT || process.cwd());
const require = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs-site', 'package.json'));
const YAML = require('yaml');
const workRoot = path.join(root, 'docs', 'epics');
const templatePaths = {
  epic: path.join(root, 'docs', 'templates', 'EPIC_TEMPLATE.md'),
  story: path.join(root, 'docs', 'templates', 'USER_STORY_TEMPLATE.md'),
  task: path.join(root, 'docs', 'templates', 'TASK_TEMPLATE.md'),
};
const statuses = new Set(['draft', 'ready', 'in-progress', 'blocked', 'done', 'cancelled']);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseFrontmatter(content, filePath = '<document>') {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    throw new Error(`${filePath}: YAML front matter is required`);
  }

  const data = YAML.parse(match[1]);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${filePath}: front matter must be a YAML mapping`);
  }

  return { data, body: content.slice(match[0].length) };
}

function getTemplate(markdown, name) {
  const match = markdown.match(/```markdown\r?\n([\s\S]*?)\r?\n```/);
  if (!match) {
    throw new Error(`Template ${name} must contain a fenced markdown document`);
  }
  return match[1];
}

function walkMarkdown(directory) {
  return readdir(directory, { withFileTypes: true }).then(async (entries) => {
    const nested = await Promise.all(entries.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walkMarkdown(filePath);
      return entry.isFile() && entry.name.endsWith('.md') ? [filePath] : [];
    }));
    return nested.flat();
  });
}

export async function loadWorkDocuments(baseRoot = root) {
  const base = path.join(baseRoot, 'docs', 'epics');
  const paths = await walkMarkdown(base).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  return Promise.all(paths.map(async (filePath) => {
    const content = await readFile(filePath, 'utf8');
    try {
      const { data } = parseFrontmatter(content, path.relative(baseRoot, filePath));
      return data.work_id ? { filePath, content, data } : null;
    } catch (error) {
      if (path.basename(filePath) === 'index.md' && !content.startsWith('---')) return null;
      throw error;
    }
  })).then((items) => items.filter(Boolean));
}

export function validateWorkDocuments(documents) {
  const errors = [];
  const byId = new Map();

  for (const document of documents) {
    const { data, content, filePath } = document;
    const label = filePath || data.work_id || '<document>';

    if (!data.work_id || !['epic', 'story', 'task'].includes(data.work_type)) {
      errors.push(`${label}: work_id and a supported work_type are required`);
      continue;
    }
    if (byId.has(data.work_id)) errors.push(`${label}: duplicate work_id ${data.work_id}`);
    byId.set(data.work_id, document);
    if (!statuses.has(data.status)) errors.push(`${label}: invalid status ${data.status}`);
    if (data.template_version !== 1) errors.push(`${label}: unsupported template_version`);
    if (!data.branch) errors.push(`${label}: branch is required`);
    if (!Array.isArray(data.depends_on)) errors.push(`${label}: depends_on must be a list`);
    if (data.status !== 'draft' && /\{\{[^}]+\}\}/.test(content)) {
      errors.push(`${label}: non-draft document contains template placeholders`);
    }
    if (!content.includes('<!-- children:start -->') || !content.includes('<!-- children:end -->')) {
      errors.push(`${label}: child document markers are required`);
    }
  }

  for (const document of documents) {
    const { data, filePath } = document;
    if (!data.work_id || !byId.has(data.work_id)) continue;
    if (data.work_type === 'epic' && data.parent !== null) {
      errors.push(`${filePath}: Epic parent must be null`);
    }
    if (data.work_type !== 'epic') {
      const parent = byId.get(data.parent);
      const expectedParentType = data.work_type === 'story' ? 'epic' : 'story';
      if (!parent) {
        errors.push(`${filePath}: parent ${data.parent} does not exist`);
      } else {
        if (parent.data.work_type !== expectedParentType) {
          errors.push(`${filePath}: parent must be a ${expectedParentType}`);
        }
        if (parent.data.branch !== data.branch) {
          errors.push(`${filePath}: branch must match parent ${data.parent}`);
        }
        if (!document.content.includes(`](${path.posix.relative(
          path.posix.dirname(filePath.replaceAll('\\', '/')),
          path.posix.basename(parent.filePath.replaceAll('\\', '/'))
        )})`)) {
          const parentName = path.posix.basename(parent.filePath.replaceAll('\\', '/'));
          const relativeParent = path.posix.relative(
            path.posix.dirname(filePath.replaceAll('\\', '/')),
            parent.filePath.replaceAll('\\', '/')
          );
          if (!document.content.includes(`](${relativeParent})`) && !document.content.includes(`](${parentName})`)) {
            errors.push(`${filePath}: parent link to ${data.parent} is missing`);
          }
        }
      }
    }
    for (const dependency of Array.isArray(data.depends_on) ? data.depends_on : []) {
      if (!byId.has(dependency)) errors.push(`${filePath}: dependency ${dependency} does not exist`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) {
      errors.push(`Dependency cycle includes ${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const document = byId.get(id);
    for (const dependency of Array.isArray(document?.data.depends_on) ? document.data.depends_on : []) {
      if (byId.has(dependency)) visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);

  return errors;
}

async function findParent(identifier, documents) {
  const exact = documents.filter(({ data }) => data.work_id === identifier);
  const suffix = documents.filter(({ data }) => data.work_id.endsWith(`/${identifier}`));
  const matches = exact.length ? exact : suffix;
  if (matches.length !== 1) {
    throw new Error(`Parent "${identifier}" must match exactly one Epic or Story (found ${matches.length})`);
  }
  return matches[0];
}

async function createDocument(type, slug, title, parentIdentifier) {
  if (!slugPattern.test(slug)) {
    throw new Error('Slug must be lowercase letters and numbers separated by single hyphens');
  }
  if (!title?.trim()) throw new Error('--title is required');
  const documents = await loadWorkDocuments();
  let parent = null;
  if (type === 'epic') {
    if (parentIdentifier) throw new Error('An Epic cannot have a parent');
  } else {
    if (!parentIdentifier) throw new Error(`--parent is required for a ${type}`);
    parent = await findParent(parentIdentifier, documents);
    const requiredType = type === 'story' ? 'epic' : 'story';
    if (parent.data.work_type !== requiredType) {
      throw new Error(`${type} documents must be created under a ${requiredType}`);
    }
  }

  let id;
  let directory;
  let filename;
  if (type === 'epic') {
    id = `EPIC-${slug}`;
    directory = path.join(workRoot, slug);
    filename = path.join(directory, 'index.md');
  } else {
    const prefix = type === 'story' ? 'STORY' : 'TASK';
    const parentFolder = path.dirname(parent.filePath);
    const childDirectory = type === 'story'
      ? path.join(parentFolder, 'stories')
      : path.join(parentFolder, 'tasks');
    const children = await loadWorkDocuments();
    const used = children
      .filter(({ data }) => data.parent === parent.data.work_id && data.work_type === type)
      .map(({ data }) => Number(data.work_id.match(new RegExp(`${prefix}-(\\d+)$`))?.[1] || 0));
    const sequence = String(Math.max(0, ...used) + 1).padStart(3, '0');
    id = `${parent.data.work_id}/${prefix}-${sequence}`;
    const childSlug = `${prefix}-${sequence}-${slug}`;
    directory = type === 'story' ? path.join(childDirectory, childSlug) : childDirectory;
    filename = type === 'story'
      ? path.join(directory, 'index.md')
      : path.join(directory, `${childSlug}.md`);
  }

  if (documents.some(({ data }) => data.work_id === id)) {
    throw new Error(`${id} already exists`);
  }
  const relativeFile = path.relative(root, filename).replaceAll('\\', '/');
  const templatePath = templatePaths[type];
  const templateMarkdown = await readFile(templatePath, 'utf8');
  let content = getTemplate(templateMarkdown, path.basename(templatePath));
  const parentLink = parent
    ? path.relative(path.dirname(filename), parent.filePath).replaceAll('\\', '/')
    : '';
  const yamlText = (value) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const replacements = {
    title: yamlText(title.trim()),
    id: yamlText(id),
    branch: yamlText(parent?.data.branch || `epic/${slug}`),
    parent_id: yamlText(parent?.data.work_id || ''),
    parent_link: parentLink,
  };
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }

  await mkdir(path.dirname(filename), { recursive: true });
  if (parent) {
    const start = '<!-- children:start -->';
    const end = '<!-- children:end -->';
    const startAt = parent.content.indexOf(start);
    const endAt = parent.content.indexOf(end);
    if (startAt < 0 || endAt < startAt) {
      throw new Error(`Parent ${parent.data.work_id} has no valid child-document section`);
    }
    const childRelative = path.relative(path.dirname(parent.filePath), filename).replaceAll('\\', '/');
    const displayId = id.split('/').at(-1);
    const entry = `\n- [${displayId}: ${title.trim()}](${childRelative})`;
    const parentContent = `${parent.content.slice(0, endAt).trimEnd()}${entry}\n${parent.content.slice(endAt)}`;
    await writeFile(filename, content, { flag: 'wx' }).catch((error) => {
      if (error.code === 'ENOENT') throw new Error(`Expected parent directory before child creation: ${error.message}`);
      throw error;
    });
    await writeFile(parent.filePath, parentContent, 'utf8');
  } else {
    await writeFile(filename, content, { flag: 'wx' });
  }

  console.log(`${id}\t${relativeFile}`);
}

function parseArguments(args) {
  const [command, typeOrAction, ...rest] = args;
  if (command === 'validate') return { command };
  if (command !== 'create' || !['epic', 'story', 'task'].includes(typeOrAction)) {
    throw new Error('Usage: planning.mjs create <epic|story|task> <slug> --title "..." [--parent <id>], or planning.mjs validate');
  }
  const slug = rest.shift();
  const options = {};
  while (rest.length) {
    const key = rest.shift();
    if (!key.startsWith('--') || !rest.length) throw new Error(`Invalid option ${key}`);
    options[key.slice(2)] = rest.shift();
  }
  return { command, type: typeOrAction, slug, title: options.title, parent: options.parent };
}

async function main(args) {
  const options = parseArguments(args);
  if (options.command === 'validate') {
    const documents = await loadWorkDocuments();
    const errors = validateWorkDocuments(documents);
    if (errors.length) {
      console.error(errors.map((error) => `- ${error}`).join('\n'));
      process.exitCode = 1;
      return;
    }
    console.log(`Validated ${documents.length} planning document(s).`);
    return;
  }
  await createDocument(options.type, options.slug, options.title, options.parent);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
