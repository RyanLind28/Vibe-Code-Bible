/**
 * Content migration script for Fumadocs.
 *
 * - Moves chapter directories into content/docs/
 * - Flattens single-file subdirectories (Chapter/Topic-Name/topic.md → chapter/topic.md)
 * - Preserves SEO's deeper nesting (SEO/Subcategory/Topic/topic.md → seo/subcategory/topic.md)
 * - Converts README.md → index.md
 * - Lowercases directory names
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'docs');

const CHAPTERS = [
  'AI-Integration',
  'Backend',
  'Copywriting',
  'DevOps',
  'Frontend',
  'Product-Growth',
  'Security',
  'SEO',
  'Testing',
  'Tools',
  'UIUX',
];

function toLowerSlug(name) {
  return name.toLowerCase();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`  ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`);
}

function migrateChapter(chapterName) {
  const srcDir = path.join(ROOT, chapterName);
  const destSlug = toLowerSlug(chapterName);
  const destDir = path.join(CONTENT_DIR, destSlug);

  if (!fs.existsSync(srcDir)) {
    console.log(`  SKIP: ${chapterName} not found`);
    return;
  }

  console.log(`\nMigrating ${chapterName} → content/docs/${destSlug}/`);
  ensureDir(destDir);

  // Copy README.md as index.md
  const readmeSrc = path.join(srcDir, 'README.md');
  if (fs.existsSync(readmeSrc)) {
    copyFile(readmeSrc, path.join(destDir, 'index.md'));
  }

  if (chapterName === 'SEO') {
    migrateSEO(srcDir, destDir);
    return;
  }

  // For non-SEO chapters: flatten single-file subdirectories
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const subDir = path.join(srcDir, entry.name);
    const mdFiles = fs.readdirSync(subDir).filter(f => f.endsWith('.md'));

    if (mdFiles.length === 1) {
      // Flatten: Topic-Name/topic.md → topic.md (using the file's own name)
      const fileName = mdFiles[0];
      copyFile(
        path.join(subDir, fileName),
        path.join(destDir, toLowerSlug(fileName))
      );
    } else if (mdFiles.length > 1) {
      // Multiple files in subdir — keep as subdirectory
      const subDestDir = path.join(destDir, toLowerSlug(entry.name));
      ensureDir(subDestDir);
      for (const f of mdFiles) {
        copyFile(
          path.join(subDir, f),
          path.join(subDestDir, toLowerSlug(f))
        );
      }
    }
  }
}

function migrateSEO(srcDir, destDir) {
  // SEO has structure: SEO/Subcategory/Topic-Name/topic.md
  // We preserve: seo/subcategory/topic.md
  const subcategories = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const subcat of subcategories) {
    if (!subcat.isDirectory()) continue;

    const subcatSrc = path.join(srcDir, subcat.name);
    const subcatSlug = toLowerSlug(subcat.name);
    const subcatDest = path.join(destDir, subcatSlug);
    ensureDir(subcatDest);

    // Check for a README in the subcategory
    const subcatReadme = path.join(subcatSrc, 'README.md');
    if (fs.existsSync(subcatReadme)) {
      copyFile(subcatReadme, path.join(subcatDest, 'index.md'));
    }

    // Each topic is a subdirectory with one .md file — flatten to subcategory level
    const topics = fs.readdirSync(subcatSrc, { withFileTypes: true });
    for (const topic of topics) {
      if (!topic.isDirectory()) continue;

      const topicDir = path.join(subcatSrc, topic.name);
      const mdFiles = fs.readdirSync(topicDir).filter(f => f.endsWith('.md'));

      for (const f of mdFiles) {
        copyFile(
          path.join(topicDir, f),
          path.join(subcatDest, toLowerSlug(f))
        );
      }
    }
  }
}

// Also copy the root README as the docs landing page
console.log('Migrating root README → content/docs/index.md');
const rootReadme = path.join(ROOT, 'README.md');
if (fs.existsSync(rootReadme)) {
  copyFile(rootReadme, path.join(CONTENT_DIR, 'index.md'));
}

for (const chapter of CHAPTERS) {
  migrateChapter(chapter);
}

console.log('\nDone! Content migrated to content/docs/');
