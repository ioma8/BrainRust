use brain_core::mindnode::{from_mindnode, to_mindnode};
use brain_core::mmap::{from_mmap, to_mmap};
use brain_core::opml::{from_opml, to_opml};
use brain_core::smmx::{from_smmx, to_smmx};
use brain_core::storage::{from_xml, to_xml};
use brain_core::xmind::{from_xmind, to_xmind};
use brain_core::MindMap;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use tauri::{Emitter, Manager, State};

const MAX_RECENT_FILES: usize = 10;
const RECENT_FILES_FILENAME: &str = "recent_files.json";

struct AppState {
    recent_files: Mutex<Vec<String>>,
}

fn lock_mutex<'a, T>(mutex: &'a Mutex<T>, err: &'static str) -> Result<MutexGuard<'a, T>, String> {
    mutex.lock().map_err(|_| err.to_string())
}

fn recent_files_path<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(RECENT_FILES_FILENAME))
}

fn load_recent_files<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Vec<String> {
    let path = match recent_files_path(app) {
        Ok(path) => path,
        Err(err) => {
            eprintln!("Failed to resolve recent files path: {err}");
            return Vec::new();
        }
    };

    let data = match std::fs::read_to_string(path) {
        Ok(data) => data,
        Err(_) => return Vec::new(),
    };

    serde_json::from_str::<Vec<String>>(&data).unwrap_or_default()
}

fn persist_recent_files<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    recent_files: &[String],
) -> Result<(), String> {
    let path = recent_files_path(app)?;
    let data = serde_json::to_string(recent_files).map_err(|e| e.to_string())?;
    std::fs::write(path, data).map_err(|e| e.to_string())?;
    Ok(())
}

fn format_recent_label(path: &str) -> String {
    let file_name = Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(path);
    format!("{file_name} - {path}")
}

fn build_open_recent_menu<R: tauri::Runtime>(
    handle: &tauri::AppHandle<R>,
    recent_files: &[String],
) -> Result<tauri::menu::Submenu<R>, String> {
    use tauri::menu::{MenuItem, PredefinedMenuItem, Submenu};

    let menu = Submenu::new(handle, "Open Recent", true).map_err(|e| e.to_string())?;
    if recent_files.is_empty() {
        let empty = MenuItem::with_id(handle, "recent_empty", "No Recent Files", false, None::<&str>)
            .map_err(|e| e.to_string())?;
        menu.append(&empty).map_err(|e| e.to_string())?;
    } else {
        for (index, path) in recent_files.iter().enumerate() {
            let label = format_recent_label(path);
            let id = format!("recent:{index}");
            let item =
                MenuItem::with_id(handle, id, label, true, None::<&str>).map_err(|e| e.to_string())?;
            menu.append(&item).map_err(|e| e.to_string())?;
        }
        let separator = PredefinedMenuItem::separator(handle).map_err(|e| e.to_string())?;
        menu.append(&separator).map_err(|e| e.to_string())?;

        let clear_item =
            MenuItem::with_id(handle, "recent_clear", "Clear Recent", true, None::<&str>)
                .map_err(|e| e.to_string())?;
        menu.append(&clear_item).map_err(|e| e.to_string())?;
    }

    Ok(menu)
}

fn build_menu<R: tauri::Runtime>(
    handle: &tauri::AppHandle<R>,
    recent_files: &[String],
) -> Result<tauri::menu::Menu<R>, String> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

    let open_recent_menu = build_open_recent_menu(handle, recent_files)?;
    let file_menu = Submenu::new(handle, "File", true).map_err(|e| e.to_string())?;
    let new_item =
        MenuItem::with_id(handle, "new", "New", true, Some("CmdOrCtrl+N")).map_err(|e| e.to_string())?;
    file_menu.append(&new_item).map_err(|e| e.to_string())?;
    let open_item =
        MenuItem::with_id(handle, "open", "Open...", true, Some("CmdOrCtrl+O")).map_err(|e| e.to_string())?;
    file_menu.append(&open_item).map_err(|e| e.to_string())?;
    let open_cloud_item =
        MenuItem::with_id(handle, "open_cloud", "Open from Cloud...", true, None::<&str>)
            .map_err(|e| e.to_string())?;
    file_menu.append(&open_cloud_item).map_err(|e| e.to_string())?;
    file_menu.append(&open_recent_menu).map_err(|e| e.to_string())?;
    let file_sep = PredefinedMenuItem::separator(handle).map_err(|e| e.to_string())?;
    file_menu.append(&file_sep).map_err(|e| e.to_string())?;
    let save_item =
        MenuItem::with_id(handle, "save", "Save", true, Some("CmdOrCtrl+S")).map_err(|e| e.to_string())?;
    file_menu.append(&save_item).map_err(|e| e.to_string())?;
    let save_as_item = MenuItem::with_id(
        handle,
        "save_as",
        "Save As...",
        true,
        Some("CmdOrCtrl+Shift+S"),
    )
    .map_err(|e| e.to_string())?;
    file_menu.append(&save_as_item).map_err(|e| e.to_string())?;
    let save_cloud_item =
        MenuItem::with_id(handle, "save_cloud", "Save to Cloud...", true, None::<&str>)
            .map_err(|e| e.to_string())?;
    file_menu.append(&save_cloud_item).map_err(|e| e.to_string())?;
    let cloud_sep = PredefinedMenuItem::separator(handle).map_err(|e| e.to_string())?;
    file_menu.append(&cloud_sep).map_err(|e| e.to_string())?;
    let cloud_auth_item =
        MenuItem::with_id(handle, "cloud_auth", "Cloud Account...", true, None::<&str>)
            .map_err(|e| e.to_string())?;
    file_menu.append(&cloud_auth_item).map_err(|e| e.to_string())?;

    #[cfg(not(target_os = "macos"))]
    {
        let exit_sep = PredefinedMenuItem::separator(handle).map_err(|e| e.to_string())?;
        file_menu.append(&exit_sep).map_err(|e| e.to_string())?;
        let exit_item =
            MenuItem::with_id(handle, "exit", "Exit", true, Some("CmdOrCtrl+Q")).map_err(|e| e.to_string())?;
        file_menu.append(&exit_item).map_err(|e| e.to_string())?;
    }

    let edit_menu = Submenu::new(handle, "Edit", true).map_err(|e| e.to_string())?;
    let add_child_item =
        MenuItem::with_id(handle, "add_child", "Add Child (Tab)", true, None::<&str>)
            .map_err(|e| e.to_string())?;
    edit_menu.append(&add_child_item).map_err(|e| e.to_string())?;
    let add_sibling_item = MenuItem::with_id(
        handle,
        "add_sibling",
        "Add Sibling (Enter)",
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    edit_menu.append(&add_sibling_item).map_err(|e| e.to_string())?;
    let delete_item = MenuItem::with_id(
        handle,
        "delete_node",
        "Delete Node (Del)",
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    edit_menu.append(&delete_item).map_err(|e| e.to_string())?;
    let rename_item = MenuItem::with_id(
        handle,
        "rename_node",
        "Rename Node (F2)",
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    edit_menu.append(&rename_item).map_err(|e| e.to_string())?;

    let menu = Menu::new(handle).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        let app_menu = Submenu::new(handle, "BrainRust", true).map_err(|e| e.to_string())?;
        let about_item = MenuItem::with_id(
            handle,
            "about",
            "About BrainRust",
            true,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        app_menu.append(&about_item).map_err(|e| e.to_string())?;
        let app_sep = PredefinedMenuItem::separator(handle).map_err(|e| e.to_string())?;
        app_menu.append(&app_sep).map_err(|e| e.to_string())?;
        let quit_item = MenuItem::with_id(
            handle,
            "exit",
            "Quit BrainRust",
            true,
            Some("CmdOrCtrl+Q"),
        )
        .map_err(|e| e.to_string())?;
        app_menu.append(&quit_item).map_err(|e| e.to_string())?;
        menu.append(&app_menu).map_err(|e| e.to_string())?;
    }

    menu.append(&file_menu).map_err(|e| e.to_string())?;
    menu.append(&edit_menu).map_err(|e| e.to_string())?;

    #[cfg(not(target_os = "macos"))]
    {
        let help_menu = Submenu::new(handle, "Help", true).map_err(|e| e.to_string())?;
        let about_item =
            MenuItem::with_id(handle, "about", "About", true, None::<&str>).map_err(|e| e.to_string())?;
        help_menu.append(&about_item).map_err(|e| e.to_string())?;
        menu.append(&help_menu).map_err(|e| e.to_string())?;
    }

    Ok(menu)
}

fn refresh_menu<R: tauri::Runtime>(
    handle: &tauri::AppHandle<R>,
    recent_files: &[String],
) -> Result<(), String> {
    let menu = build_menu(handle, recent_files)?;
    handle.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

fn update_recent_files<R: tauri::Runtime>(
    handle: &tauri::AppHandle<R>,
    state: &AppState,
    path: &str,
) -> Result<(), String> {
    let mut recent_files = lock_mutex(&state.recent_files, "Recent files state lock was poisoned")?;
    recent_files.retain(|item| item != path);
    recent_files.insert(0, path.to_string());
    if recent_files.len() > MAX_RECENT_FILES {
        recent_files.truncate(MAX_RECENT_FILES);
    }
    let recent_snapshot = recent_files.clone();
    drop(recent_files);
    persist_recent_files(handle, &recent_snapshot)?;
    refresh_menu(handle, &recent_snapshot)?;
    Ok(())
}


fn read_map_from_path(path: &str) -> Result<MindMap, String> {
    let path_obj = Path::new(path);
    let ext = path_obj
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "xmind" => {
            let content = std::fs::read(path).map_err(|e| e.to_string())?;
            from_xmind(&content)
        }
        "opml" => {
            let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
            from_opml(&content)
        }
        "mmap" => {
            let content = std::fs::read(path).map_err(|e| e.to_string())?;
            from_mmap(&content)
        }
        "mindnode" => {
            let content = std::fs::read(path).map_err(|e| e.to_string())?;
            from_mindnode(&content)
        }
        "smmx" => {
            let content_bytes = std::fs::read(path).map_err(|e| e.to_string())?;
            if content_bytes.len() > 4 && &content_bytes[0..4] == b"PK\x03\x04" {
                return Err("SMMX ZIP format not yet supported".to_string());
            }
            let content_str =
                String::from_utf8(content_bytes).map_err(|_| "Invalid UTF-8".to_string())?;
            from_smmx(&content_str)
        }
        _ => {
            let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
            from_xml(&content)
        }
    }
}

fn write_map_to_path(map: &MindMap, path: &str) -> Result<(), String> {
    let path_obj = Path::new(path);
    let ext = path_obj
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "xmind" => {
            let content = to_xmind(map)?;
            std::fs::write(path, content).map_err(|e| e.to_string())?;
        }
        "opml" => {
            let content = to_opml(map)?;
            std::fs::write(path, content).map_err(|e| e.to_string())?;
        }
        "mmap" => {
            let content = to_mmap(map)?;
            std::fs::write(path, content).map_err(|e| e.to_string())?;
        }
        "mindnode" => {
            let content = to_mindnode(map)?;
            std::fs::write(path, content).map_err(|e| e.to_string())?;
        }
        "smmx" => {
            let content = to_smmx(map)?;
            std::fs::write(path, content).map_err(|e| e.to_string())?;
        }
        _ => {
            let content = to_xml(map)?;
            std::fs::write(path, content).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn load_map_file(
    app: tauri::AppHandle,
    state: State<AppState>,
    path: String,
) -> Result<MindMap, String> {
    let map = read_map_from_path(&path)?;
    update_recent_files(&app, &state, &path)?;
    Ok(map)
}

#[tauri::command]
fn save_map_file(
    app: tauri::AppHandle,
    state: State<AppState>,
    path: String,
    map: MindMap,
) -> Result<String, String> {
    write_map_to_path(&map, &path)?;
    update_recent_files(&app, &state, &path)?;
    Ok(path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            recent_files: Mutex::new(Vec::new()),
        })
        .invoke_handler(tauri::generate_handler![
            load_map_file,
            save_map_file
        ])
        .setup(|app| {
            let handle = app.handle();
            let recent_files = load_recent_files(&handle);
            if let Ok(mut stored) =
                lock_mutex(&app.state::<AppState>().recent_files, "Recent files state lock was poisoned")
            {
                *stored = recent_files.clone();
            }
            if let Err(err) = refresh_menu(&handle, &recent_files) {
                eprintln!("Failed to build menu: {err}");
            }

            app.on_menu_event(move |app, event| {
                let id = event.id().as_ref();

                if id == "recent_clear" {
                    match lock_mutex(
                        &app.state::<AppState>().recent_files,
                        "Recent files state lock was poisoned",
                    ) {
                        Ok(mut recent_files) => {
                            recent_files.clear();
                            if let Err(err) = persist_recent_files(app, &recent_files) {
                                eprintln!("Failed to clear recent files: {err}");
                            }
                            if let Err(err) = refresh_menu(app, &recent_files) {
                                eprintln!("Failed to refresh menu: {err}");
                            }
                        }
                        Err(err) => eprintln!("{err}"),
                    }
                    return;
                }

                if let Some(index_str) = id.strip_prefix("recent:") {
                    if let Ok(index) = index_str.parse::<usize>() {
                        if let Ok(recent_files) = lock_mutex(
                            &app.state::<AppState>().recent_files,
                            "Recent files state lock was poisoned",
                        ) {
                            if let Some(path) = recent_files.get(index) {
                                let _ = app.emit("menu-open-recent", path);
                            }
                        }
                    }
                    return;
                }

                match id {
                    "new" => {
                        let _ = app.emit("menu-event", "new");
                    }
                    "open" => {
                        let _ = app.emit("menu-event", "open");
                    }
                    "save" => {
                        let _ = app.emit("menu-event", "save");
                    }
                    "save_as" => {
                        let _ = app.emit("menu-event", "save_as");
                    }
                    "save_cloud" => {
                        let _ = app.emit("menu-event", "save_cloud");
                    }
                    "open_cloud" => {
                        let _ = app.emit("menu-event", "open_cloud");
                    }
                    "cloud_auth" => {
                        let _ = app.emit("menu-event", "cloud_auth");
                    }
                    "exit" => {
                        let _ = app.emit("menu-event", "exit");
                    }
                    "add_child" => {
                        let _ = app.emit("menu-event", "add_child");
                    }
                    "add_sibling" => {
                        let _ = app.emit("menu-event", "add_sibling");
                    }
                    "delete_node" => {
                        let _ = app.emit("menu-event", "delete_node");
                    }
                    "rename_node" => {
                        let _ = app.emit("menu-event", "rename_node");
                    }
                    "about" => {
                        let _ = app.emit("menu-event", "about");
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
