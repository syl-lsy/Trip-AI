#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ACTIVE_DIR = path.resolve(__dirname, '..', 'docs/memory/conversations/active');
const ARCHIVES_DIR = path.resolve(__dirname, '..', 'docs/memory/conversations/archives');

function toBeijingDate() {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utcMs + 8 * 60 * 60 * 1000);
}

function extractSummary(content) {
  const lines = content.split('\n');
  const summary = {
    decisions: [],
    preferences: [],
    unfinished: [],
    keyTopics: new Set(),
  };

  for (const line of lines) {
    if (line.match(/决定|选择|确认|用|改成|偏好|喜欢/)) {
      summary.decisions.push(line.trim());
    }
    if (line.match(/偏好|喜欢|习惯|风格/)) {
      summary.preferences.push(line.trim());
    }
    if (line.match(/未完成|TODO|后续|下一步|计划|需要.*做/)) {
      summary.unfinished.push(line.trim());
    }
    const topicMatch = line.match(/^#+\s+(.+)/);
    if (topicMatch) {
      summary.keyTopics.add(topicMatch[1].trim());
    }
  }

  return summary;
}

async function compress() {
  let files;
  try {
    files = fs.readdirSync(ACTIVE_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => ({ name: f, path: path.join(ACTIVE_DIR, f), mtime: fs.statSync(path.join(ACTIVE_DIR, f)).mtime }))
      .sort((a, b) => a.mtime - b.mtime);
  } catch {
    console.log('active/ 目录不存在或为空，跳过。');
    return;
  }

  if (files.length <= 10) {
    console.log(`active/ 中有 ${files.length} 个文件，未超过 10 个，无需压缩。`);
    return;
  }

  const keepCount = 5;
  const filesToArchive = files.slice(0, files.length - keepCount);

  console.log(`压缩 ${filesToArchive.length} 个文件，保留最新 ${keepCount} 个...`);

  const allSummaries = {
    sessions: [],
    decisions: [],
    preferences: [],
    unfinished: [],
    keyTopics: new Set(),
  };

  for (const file of filesToArchive) {
    const content = fs.readFileSync(file.path, 'utf-8');
    const summary = extractSummary(content);

    allSummaries.sessions.push(file.name);
    allSummaries.decisions.push(...summary.decisions);
    allSummaries.preferences.push(...summary.preferences);
    allSummaries.unfinished.push(...summary.unfinished);
    summary.keyTopics.forEach(t => allSummaries.keyTopics.add(t));
  }

  const date = toBeijingDate();
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  if (!fs.existsSync(ARCHIVES_DIR)) {
    fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
  }

  const archiveFile = path.join(ARCHIVES_DIR, `${month}-summary.md`);

  let output = `# 对话日志摘要 - ${month}\n\n`;
  output += `> 压缩自 ${filesToArchive.length} 个会话日志\n\n`;
  output += `## 包含的会话\n\n`;
  for (const s of allSummaries.sessions) {
    output += `- ${s}\n`;
  }

  output += `\n## 关键话题\n\n`;
  for (const t of allSummaries.keyTopics) {
    output += `- ${t}\n`;
  }

  if (allSummaries.decisions.length > 0) {
    output += `\n## 决策记录\n\n`;
    for (const d of [...new Set(allSummaries.decisions)]) {
      output += `- ${d}\n`;
    }
  }

  if (allSummaries.preferences.length > 0) {
    output += `\n## 用户偏好\n\n`;
    for (const p of [...new Set(allSummaries.preferences)]) {
      output += `- ${p}\n`;
    }
  }

  if (allSummaries.unfinished.length > 0) {
    output += `\n## 未完成任务\n\n`;
    for (const u of [...new Set(allSummaries.unfinished)]) {
      output += `- ${u}\n`;
    }
  }

  const existingContent = fs.existsSync(archiveFile) ? fs.readFileSync(archiveFile, 'utf-8') : '';
  fs.writeFileSync(archiveFile, existingContent + '\n\n' + output);

  for (const file of filesToArchive) {
    fs.unlinkSync(file.path);
    console.log(`  已删除: ${file.name}`);
  }

  console.log(`\n✅ 对话日志归档完成：${archiveFile}`);
  console.log(`   保留 ${keepCount} 条，压缩 ${filesToArchive.length} 条`);
}

compress().catch(console.error);
