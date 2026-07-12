#!/bin/bash
# Archive memory conversation logs
# Keep latest 5 in active/, move older ones to archives/YYYY-MM/ as individual files
# Follows docs/memory/MANAGEMENT.md rules
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ACTIVE_DIR="$PROJECT_DIR/docs/memory/conversations/active"
ARCHIVE_DIR="$PROJECT_DIR/docs/memory/conversations/archives"
ROOT_DIR="$PROJECT_DIR/docs/memory/conversations"

MAX_ARCHIVE_FILES=100

mkdir -p "$ARCHIVE_DIR"

archive_file() {
  local file="$1"
  local basename
  basename=$(basename "$file" .md)
  local month="${basename:0:7}"
  local target_dir="$ARCHIVE_DIR/$month"
  local index_file="$target_dir/INDEX.md"

  mkdir -p "$target_dir"

  cp "$file" "$target_dir/$basename.md"

  if [ ! -f "$index_file" ]; then
    echo "# 归档索引 - $month" > "$index_file"
    echo "" >> "$index_file"
    echo "| 文件 | 日期 |" >> "$index_file"
    echo "|------|------|" >> "$index_file"
  fi
  echo "| $basename.md | ${basename:0:10} |" >> "$index_file"

  rm "$file"
}

archive_dir() {
  local dir="$1"
  local label="$2"
  local max_keep="${3:-5}"

  if [ ! -d "$dir" ]; then
    return 0
  fi

  shopt -s nullglob
  local raw_files=("$dir"/*.md)
  shopt -u nullglob

  local count=${#raw_files[@]}
  if [ "$count" -le "$max_keep" ]; then
    return 0
  fi

  local to_archive=$((count - max_keep))
  for ((i=0; i<to_archive; i++)); do
    local f="${raw_files[$i]}"
    archive_file "$f"
    echo "  [OK] archived: $label/$(basename "$f")"
  done
}

gc_archives() {
  local all_files=()
  while IFS= read -r -d '' f; do
    all_files+=("$f")
  done < <(find "$ARCHIVE_DIR" -name '*.md' ! -name 'INDEX.md' -print0 2>/dev/null | sort -z)

  local total=${#all_files[@]}
  if [ "$total" -le "$MAX_ARCHIVE_FILES" ]; then
    return 0
  fi

  local to_remove=$((total - MAX_ARCHIVE_FILES))
  for ((i=0; i<to_remove; i++)); do
    local f="${all_files[$i]}"
    local month_dir
    month_dir=$(dirname "$f")
    local index_file="$month_dir/INDEX.md"
    local filename=$(basename "$f")

    rm "$f"

    if [ -f "$index_file" ]; then
      sed -i '' "/| $filename |/d" "$index_file" 2>/dev/null || true
    fi

    local remaining
    remaining=$(find "$month_dir" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
    if [ "$remaining" -eq 0 ]; then
      rm -rf "$month_dir"
    fi

    echo "  [GC] removed oldest: $(basename "$f")"
  done
}

echo "--- archive-conversations ---"

archive_dir "$ROOT_DIR" "conversations" 0
archive_dir "$ACTIVE_DIR" "active" 5
gc_archives

echo "--- done ---"
