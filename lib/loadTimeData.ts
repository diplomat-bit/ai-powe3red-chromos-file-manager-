
const DATA = {
    "A11Y_VOLUME_EJECT": "$1 has been ejected.",
    "ALL_FILES_FILTER": "All files",
    "ANDROID_FILES_ROOT_LABEL": "Play files",
    "AUDIO_FILE_TYPE": "$1 audio",
    "CANCEL_LABEL": "Cancel",
    "CLOSE_LABEL": "Close",
    "DATE_COLUMN_LABEL": "Date modified",
    "DELETE_BUTTON_LABEL": "Delete",
    "DOWNLOADS_DIRECTORY_LABEL": "Downloads",
    "DRIVE_DIRECTORY_LABEL": "Google Drive",
    "DRIVE_MY_DRIVE_LABEL": "My Drive",
    "DRIVE_RECENT_COLLECTION_LABEL": "Recent",
    "DRIVE_SHARED_WITH_ME_COLLECTION_LABEL": "Shared with me",
    "DRIVE_OFFLINE_COLLECTION_LABEL": "Offline",
    "EMPTY_TRASH_BUTTON_LABEL": "Empty trash now",
    "FILES_SETTINGS_LABEL": "Files settings",
    "FOLDER": "Folder",
    "GENERIC_FILE_TYPE": "$1 file",
    "IMAGE_FILE_TYPE": "$1 image",
    "LINUX_FILES_ROOT_LABEL": "Linux files",
    "MY_FILES_ROOT_LABEL": "My files",
    "NAME_COLUMN_LABEL": "Name",
    "NEW_FOLDER_BUTTON_LABEL": "New folder",
    "OPEN_LABEL": "Open",
    "RECENT_ROOT_LABEL": "Recent",
    "SEARCH_TEXT_LABEL": "Search",
    "SIZE_COLUMN_LABEL": "Size",
    "TRASH_ROOT_LABEL": "Trash",
    "VIDEO_FILE_TYPE": "$1 video",
    "DRIVE_PREPARING_TO_SYNC": "Preparing to sync Drive files…",
    "DRIVE_SINGLE_FILE_SYNCING": "Syncing 1 Drive file",
    "BULK_PINNING_FILE_SYNC_ON": "File sync is on",
    // Added missing keys to resolve "is not assignable to parameter of type" errors in App.tsx
    "FILEMANAGER_APP_NAME": "Files",
    "GOOGLE_DRIVE_SETTINGS_LINK": "Google Drive settings",
    "ONE_FILE_SELECTED": "1 file selected"
};

export function str(id: keyof typeof DATA): string {
  return DATA[id] || id;
}

export function strf(id: keyof typeof DATA, ...args: any[]): string {
  let template = str(id);
  args.forEach((arg, i) => {
    template = template.replace(`$${i + 1}`, String(arg));
  });
  return template;
}
