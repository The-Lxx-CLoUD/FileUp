
set -euo pipefail
cd "$(dirname "$0")"

LANG_="en"                      
PART=$((20 * 1024 * 1024))       
OUT="release"
PARTS_DIR="$OUT/parts"

step_build() {
  echo "==> [1/5] vite build (renderer)"
  npm run build:renderer

  echo "==> [2/5] electron-builder: Windows NSIS x64"
  npx electron-builder --win --x64

  echo "==> [3/5] electron-builder: Linux deb + AppImage x64"
  npx electron-builder --linux --x64

  echo "==> [4/5] rename artifacts (lang marker, version-independent)"
  local exe deb appimg
  exe=$(ls "$OUT"/FileUp-*-Setup-x64.exe 2>/dev/null | head -1 || true)
  deb=$(ls "$OUT"/FileUp-*-amd64.deb 2>/dev/null | head -1 || true)
  appimg=$(ls "$OUT"/FileUp-*-x64.AppImage 2>/dev/null | grep -v -- '-en-' | head -1 || true)
  [ -n "$exe" ]    && mv -f "$exe"    "${exe/Setup-x64.exe/Setup-${LANG_}-x64.exe}"
  [ -n "$deb" ]    && mv -f "$deb"    "${deb/-amd64.deb/-${LANG_}-amd64.deb}"
  [ -n "$appimg" ] && mv -f "$appimg" "${appimg/-x64.AppImage/-${LANG_}-x86_64.AppImage}"
  ls -la "$OUT" | grep -E 'FileUp' || true
  echo "==> [4/5] done"
}

step_split() {
  echo "==> [5/5] split installers into ${PART} byte parts -> $PARTS_DIR"
  rm -rf "$PARTS_DIR"; mkdir -p "$PARTS_DIR"

  local f base size nparts i part out mode line
  local bat_parts=() sh_parts=() originals=()

  for f in "$OUT"/FileUp-*-${LANG_}-*.exe "$OUT"/FileUp-*-${LANG_}-*.deb "$OUT"/FileUp-*-${LANG_}-*.AppImage; do
    [ -e "$f" ] || continue
    base=$(basename "$f"); size=$(stat -c%s "$f"); nparts=$(( (size + PART - 1) / PART ))
    originals+=("$base")
    i=0
    while [ $i -lt $nparts ]; do
      part=$(printf '%s.part%02d' "$base" "$i")
      dd if="$f" of="$PARTS_DIR/$part" bs=1M skip=$(( i * 20 )) count=20 iflag=fullblock status=none
      i=$(( i + 1 ))
    done
    if [[ "$base" == *.exe ]]; then
      bat_parts+=("$base")
    else
      sh_parts+=("$base")
    fi
    echo "    $base -> $nparts parts ($size bytes)"
  done

  { echo '@echo off'
    echo 'cd /d "%~dp0"'
    for base in "${bat_parts[@]}"; do
      line='copy /b'
      i=0; nparts=$(ls "$PARTS_DIR" | grep -c "^${base//./\\.}\\.part")
      first=1
      for p in $(ls "$PARTS_DIR" | grep "^${base//./\\.}\\.part" | sort); do
        if [ $first -eq 1 ]; then line="$line\"$p\""; first=0; else line="$line+\"$p\""; fi
      done
      echo "$line \"$base\""
    done
    echo 'echo Rejoined OK.'
    echo 'del rejoin.log 2>nul'
  } > "$PARTS_DIR/rejoin-windows.bat"
  unix2dos "$PARTS_DIR/rejoin-windows.bat" 2>/dev/null || sed -i 's/$/\r/' "$PARTS_DIR/rejoin-windows.bat"

  { echo '#!/usr/bin/env bash'
    echo 'set -e'
    echo 'cd "$(dirname "$0")"'
    for base in "${sh_parts[@]}"; do
      line='cat'
      for p in $(ls "$PARTS_DIR" | grep "^${base//./\\.}\\.part" | sort); do
        line="$line $p"
      done
      echo "$line > \"$base\""
    done
    echo 'echo "Rejoined OK."'
    echo 'chmod +x *.AppImage 2>/dev/null || true'
  } > "$PARTS_DIR/rejoin-linux.sh"
  chmod 755 "$PARTS_DIR/rejoin-linux.sh"

  ( cd "$OUT" && md5sum FileUp-*-${LANG_}-*.exe FileUp-*-${LANG_}-*.deb FileUp-*-${LANG_}-*.AppImage 2>/dev/null || true ) > "$PARTS_DIR/MD5SUMS.txt"
  ( cd "$PARTS_DIR" && ls *.part* 2>/dev/null | xargs -r md5sum ) >> "$PARTS_DIR/MD5SUMS.txt"

  echo "==> parts:"
  ls -la "$PARTS_DIR"
}

case "${1:-all}" in
  build) step_build ;;
  split) step_split ;;
  all)   step_build; step_split ;;
  *) echo "usage: $0 [build|split|all]"; exit 1 ;;
esac
