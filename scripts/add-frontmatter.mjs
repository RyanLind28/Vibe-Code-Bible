/**
 * Frontmatter injection script.
 *
 * Reads each .md file in content/docs/, extracts the H1 title and
 * optional blockquote description, and prepends YAML frontmatter.
 * Skips files that already have frontmatter.
 */
import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = path.resolve(import.meta.dirname, '..', 'content', 'docs');

function getAllMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllMdFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractTitleAndDescription(content) {
  const lines = content.split('\n');
  let title = '';
  let description = '';

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();

    // Extract H1 title
    if (!title && line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim();
      continue;
    }

    // Extract blockquote description (first one after H1)
    if (title && !description && line.startsWith('>')) {
      description = line.replace(/^>\s*/, '').trim();
      break;
    }
  }

  return { title, description };
}

function escapeYaml(str) {
  // Escape strings that contain colons, quotes, or other YAML-special chars
  if (/[:#'"{}[\]|>&*!%@`]/.test(str) || str.includes('\n')) {
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return str;
}

const files = getAllMdFiles(CONTENT_DIR);
let processed = 0;
let skipped = 0;

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rel = path.relative(CONTENT_DIR, filePath);

  // Skip files that already have frontmatter
  if (content.trimStart().startsWith('---')) {
    console.log(`  SKIP (has frontmatter): ${rel}`);
    skipped++;
    continue;
  }

  const { title, description } = extractTitleAndDescription(content);

  if (!title) {
    // Use filename as fallback title
    const fallback = path.basename(filePath, '.md')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    console.log(`  WARN: No H1 found in ${rel}, using filename: "${fallback}"`);

    const frontmatter = `---\ntitle: ${escapeYaml(fallback)}\n---\n`;
    fs.writeFileSync(filePath, frontmatter + content);
    processed++;
    continue;
  }

  let frontmatter = `---\ntitle: ${escapeYaml(title)}\n`;
  if (description) {
    frontmatter += `description: ${escapeYaml(description)}\n`;
  }
  frontmatter += '---\n';

  fs.writeFileSync(filePath, frontmatter + content);
  console.log(`  OK: ${rel} → "${title}"`);
  processed++;
}

console.log(`\nDone! Processed: ${processed}, Skipped: ${skipped}, Total: ${files.length}`);
