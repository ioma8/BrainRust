use brain_core::mindnode::{from_mindnode, to_mindnode};
use brain_core::mmap::{from_mmap, to_mmap};
use brain_core::opml::{from_opml, to_opml};
use brain_core::smmx::{from_smmx, to_smmx};
use brain_core::storage::{from_xml, to_xml};
use brain_core::xmind::{from_xmind, to_xmind};
use brain_core::{MindMap, Navigation};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use tauri::{Emitter, Manager, State};

const MAX_RECENT_FILES: usize = 10;
const RECENT_FILES_FILENAME: &str = "recent_files.json";

struct AppState {
    map: Mutex<MindMap>,
    file_path: Mutex<Option<String>>,
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

    persist_recent_files(handle, &recent_files)?;
    refresh_menu(handle, &recent_files)?;
    Ok(())
}

#[tauri::command]
fn get_map(state: State<AppState>) -> Result<MindMap, String> {
    Ok(lock_mutex(&state.map, "Mind map state lock was poisoned")?.clone())
}

#[tauri::command]
fn new_map(state: State<AppState>) -> Result<MindMap, String> {
    let mut map = lock_mutex(&state.map, "Mind map state lock was poisoned")?;
    *map = MindMap::new();

    let mut path = lock_mutex(&state.file_path, "File path state lock was poisoned")?;
    *path = None;

    Ok(map.clone())
}

#[tauri::command]
fn get_file_path(state: State<AppState>) -> Result<Option<String>, String> {
    Ok(lock_mutex(&state.file_path, "File path state lock was poisoned")?.clone())
}

// ... other commands (add_child, etc. - no need to modify unless needed)

#[tauri::command]
fn add_child(state: State<AppState>, parent_id: String, content: String) -> Result<String, String> {
    let mut map = lock_mutex(&state.map, "Mind map state lock was poisoned")?;
    let res = map.add_child(&parent_id, content)?;
    Ok(res)
}

#[tauri::command]
fn add_sibling(state: State<AppState>, node_id: String, content: String) -> Result<String, String> {
    let mut map = lock_mutex(&state.map, "Mind map state lock was poisoned")?;
    let res = map.add_sibling(&node_id, content)?;
    Ok(res)
}

#[tauri::command]
fn change_node(state: State<AppState>, node_id: String, content: String) -> Result<(), String> {
    let mut map = lock_mutex(&state.map, "Mind map state lock was poisoned")?;
    map.change_node(&node_id, content)?;
    Ok(())
}

#[tauri::command]
fn remove_node(state: State<AppState>, node_id: String) -> Result<(), String> {
    let mut map = lock_mutex(&state.map, "Mind map state lock was poisoned")?;
    map.remove_node(&node_id)?;
    Ok(())
}

#[tauri::command]
fn navigate(state: State<AppState>, direction: Navigation) -> Result<(), String> {
    let mut map = lock_mutex(&state.map, "Mind map state lock was poisoned")?;
    map.navigate(direction);
    Ok(())
}

#[tauri::command]
fn select_node(state: State<AppState>, node_id: String) -> Result<(), String> {
    let mut map = lock_mutex(&state.map, "Mind map state lock was poisoned")?;
    map.select_node(&node_id)
}

#[tauri::command]
fn save_map(app: tauri::AppHandle, state: State<AppState>, path: Option<String>) -> Result<String, String> {
    let map = lock_mutex(&state.map, "Mind map state lock was poisoned")?;

    let mut current_path = lock_mutex(&state.file_path, "File path state lock was poisoned")?;

    let target_path = if let Some(p) = path {
        *current_path = Some(p.clone());
        p
    } else if let Some(p) = &*current_path {
        p.clone()
    } else {
        return Err("No path specified and no current path defined".to_string());
    };

    let path_obj = Path::new(&target_path);
    let ext = path_obj
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "xmind" => {
            let content = to_xmind(&map)?;
            std::fs::write(&target_path, content).map_err(|e| e.to_string())?;
        }
        "opml" => {
            let content = to_opml(&map)?;
            std::fs::write(&target_path, content).map_err(|e| e.to_string())?;
        }
        "mmap" => {
            let content = to_mmap(&map)?;
            std::fs::write(&target_path, content).map_err(|e| e.to_string())?;
        }
        "mindnode" => {
            let content = to_mindnode(&map)?;
            std::fs::write(&target_path, content).map_err(|e| e.to_string())?;
        }
        "smmx" => {
            let content = to_smmx(&map)?;
            std::fs::write(&target_path, content).map_err(|e| e.to_string())?;
        }
        _ => {
            // Default to FreeMind (.mm)
            let content = to_xml(&map)?;
            std::fs::write(&target_path, content).map_err(|e| e.to_string())?;
        }
    }

    update_recent_files(&app, &state, &target_path)?;
    Ok(target_path)
}

#[tauri::command]
fn load_map(app: tauri::AppHandle, state: State<AppState>, path: String) -> Result<(), String> {
    let path_obj = Path::new(&path);
    let ext = path_obj
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    let new_map = match ext.as_str() {
        "xmind" => {
            let content = std::fs::read(&path).map_err(|e| e.to_string())?;
            from_xmind(&content)?
        }
        "opml" => {
            let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            from_opml(&content)?
        }
        "mmap" => {
            let content = std::fs::read(&path).map_err(|e| e.to_string())?;
            from_mmap(&content)?
        }
        "mindnode" => {
            let content = std::fs::read(&path).map_err(|e| e.to_string())?;
            from_mindnode(&content)?
        }
        "smmx" => {
            // SMMX can be XML or ZIP. Try XML first, if fails, try ZIP?
            // Or check magic bytes?
            // For now, let's try reading as string. If it fails (binary), try reading as zip.
            // Actually, `from_smmx` currently expects XML string.
            // If it's a zip, `read_to_string` might fail or return garbage.
            // Let's try to read as bytes.
            let content_bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
            // Check if it looks like a zip (PK header)
            if content_bytes.len() > 4 && &content_bytes[0..4] == b"PK\x03\x04" {
                // It's a zip, but we haven't implemented SMMX zip reading yet.
                // Assuming XML for now as per implementation.
                // If user provides ZIP SMMX, this will fail.
                // TODO: Implement SMMX ZIP support if needed.
                return Err("SMMX ZIP format not yet supported".to_string());
            } else {
                let content_str =
                    String::from_utf8(content_bytes).map_err(|_| "Invalid UTF-8".to_string())?;
                from_smmx(&content_str)?
            }
        }
        _ => {
            // Default to FreeMind (.mm)
            let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            from_xml(&content)?
        }
    };

    let mut map = lock_mutex(&state.map, "Mind map state lock was poisoned")?;
    *map = new_map;

    let mut current_path = lock_mutex(&state.file_path, "File path state lock was poisoned")?;
    *current_path = Some(path.clone());

    update_recent_files(&app, &state, &path)?;
    Ok(())
}

#[tauri::command]
fn add_icon(state: State<AppState>, node_id: String, icon: String) -> Result<(), String> {
    let mut map = lock_mutex(&state.map, "Mind map state lock was poisoned")?;
    map.add_icon(&node_id, icon)?;
    Ok(())
}

#[tauri::command]
fn remove_last_icon(state: State<AppState>, node_id: String) -> Result<(), String> {
    let mut map = lock_mutex(&state.map, "Mind map state lock was poisoned")?;
    map.remove_last_icon(&node_id)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let map = MindMap::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            map: Mutex::new(map),
            file_path: Mutex::new(None),
            recent_files: Mutex::new(Vec::new()),
        })
        .invoke_handler(tauri::generate_handler![
            get_map,
            new_map,
            get_file_path,
            add_child,
            add_sibling,
            change_node,
            remove_node,
            navigate,
            select_node,
            save_map,
            load_map,
            add_icon,
            remove_last_icon
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
