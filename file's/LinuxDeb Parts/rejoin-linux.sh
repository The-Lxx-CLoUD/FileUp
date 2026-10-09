#!/bin/bash
# ==============================================================
#  FileUp v3.1.0 - Rejoin 20MB split parts (Linux / macOS)
#  HOW TO USE: keep this script in the SAME folder as the
#  .fuppart.xxx files, then run:   bash rejoin-linux.sh
# ==============================================================
set -u

DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -n "${1:-}" ]; then DIR="$(cd "$(dirname "$1")" && pwd)"; fi
cd "$DIR" || { echo "[ERROR] Cannot enter folder: $DIR"; exit 1; }

FIRST_LIST=$(ls -1 *.fuppart.000 2>/dev/null)
if [ -z "$FIRST_LIST" ]; then
  echo ""
  echo " [ERROR] No .fuppart.000 file was found in: $DIR"
  echo "  1. Extract the ZIP file first"
  echo "  2. Keep rejoin-linux.sh in the SAME folder as the parts"
  echo "  3. Run again:  bash rejoin-linux.sh"
  echo ""
  exit 1
fi

FOUND=0
for FIRST in $FIRST_LIST; do
  BASE="${FIRST%.fuppart.000}"
  echo ""
  echo " Joining : $BASE"
  echo " Folder  : $DIR"
  echo " Parts   :"
  for f in "$BASE".fuppart.*; do echo "   $f"; done
  echo ""

  TMP="$BASE.rejoin.tmp"
  rm -f "$TMP"
  : > "$TMP"
  for f in "$BASE".fuppart.*; do
    [ -f "$f" ] || continue
    cat -- "$f" >> "$TMP" || { echo " [ERROR] Failed reading: $f"; rm -f "$TMP"; exit 1; }
  done
  mv -f "$TMP" "$BASE"

  case "$BASE" in
    "FileUp-3.1.0-Setup-en-x64.exe") EXPECTED="e540cdc6a5b07a7e3af9097960cb7f7a" ;;
    "FileUp-3.1.0-amd64.deb") EXPECTED="15daa1dc5429935fabfb5f6558c853a1" ;;
    "FileUp-3.1.0-x86_64.AppImage") EXPECTED="b0018f91980609a5f231da93a36d3343" ;;
    *) EXPECTED="" ;;
  esac

  GOT=""
  if command -v md5sum >/dev/null 2>&1; then
    GOT=$(md5sum -- "$BASE" 2>/dev/null | awk '{print $1}')
  elif command -v md5 >/dev/null 2>&1; then
    GOT=$(md5 -q "$BASE" 2>/dev/null)
  fi

  echo ""
  if [ -z "$EXPECTED" ]; then
    echo " [OK] Joined: $BASE   (no reference MD5 for this set - check skipped)"
  elif [ -z "$GOT" ]; then
    echo " [INFO] md5 tool unavailable - verification skipped for $BASE"
  elif [ "$GOT" = "$EXPECTED" ]; then
    echo " [OK] MD5 verified: $GOT"
    echo " File created: $DIR/$BASE"
  else
    echo " [WARNING] MD5 mismatch for $BASE"
    echo "  got     : $GOT"
    echo "  expected: $EXPECTED"
    echo "  Some parts are missing or corrupted - re-download them."
  fi
  FOUND=$((FOUND+1))
done

echo ""
echo " Done. $FOUND set(s) joined."
exit 0
