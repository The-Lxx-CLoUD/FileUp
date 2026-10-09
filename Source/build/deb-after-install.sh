set -e

APP_PATH="/opt/FileUp/fileup"

if [ -d "/opt/FileUp" ]; then
  chown -R root:root /opt/FileUp 2>/dev/null || true
  chmod 755 "$APP_PATH" 2>/dev/null || true
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications 2>/dev/null || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor 2>/dev/null || true
fi

exit 0
