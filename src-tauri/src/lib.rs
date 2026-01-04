use std::sync::Mutex;
use brain_core::{MindMap, Navigation};
use brain_core::storage::{to_xml, from_xml};
use brain_core::xmind::{to_xmind, from_xmind};
use tauri::{State, Emitter};

struct AppState {
    map: Mutex<MindMap>,
    file_path: Mutex<Option<String>>,
}

#[tauri::command]
fn get_map(state: State<AppState>) -> MindMap {
    state.map.lock().unwrap().clone()
}

#[tauri::command]
fn new_map(state: State<AppState>) -> MindMap {
    let mut map = state.map.lock().unwrap();
    *map = MindMap::new();
    map.compute_layout();
    
    let mut path = state.file_path.lock().unwrap();
    *path = None;
    
    map.clone()
}

#[tauri::command]
fn get_file_path(state: State<AppState>) -> Option<String> {
    state.file_path.lock().unwrap().clone()
}

// ... other commands (add_child, etc. - no need to modify unless needed)

#[tauri::command]
fn add_child(state: State<AppState>, parent_id: String, content: String) -> Result<String, String> {
    let mut map = state.map.lock().unwrap();
    let res = map.add_child(&parent_id, content)?;
    map.compute_layout();
    Ok(res)
}

#[tauri::command]
fn add_sibling(state: State<AppState>, node_id: String, content: String) -> Result<String, String> {
    let mut map = state.map.lock().unwrap();
    let res = map.add_sibling(&node_id, content)?;
    map.compute_layout();
    Ok(res)
}

#[tauri::command]
fn change_node(state: State<AppState>, node_id: String, content: String) -> Result<(), String> {
    let mut map = state.map.lock().unwrap();
    map.change_node(&node_id, content)
}

#[tauri::command]
fn remove_node(state: State<AppState>, node_id: String) -> Result<(), String> {
    let mut map = state.map.lock().unwrap();
    let res = map.remove_node(&node_id)?;
    map.compute_layout();
    Ok(res)
}

#[tauri::command]
fn navigate(state: State<AppState>, direction: Navigation) -> Result<(), String> {
    let mut map = state.map.lock().unwrap();
    map.navigate(direction);
    Ok(())
}

#[tauri::command]
fn select_node(state: State<AppState>, node_id: String) -> Result<(), String> {
    let mut map = state.map.lock().unwrap();
    map.select_node(&node_id)
}

#[tauri::command]
fn save_map(state: State<AppState>, path: Option<String>) -> Result<String, String> {
    let map = state.map.lock().unwrap();
    let content = to_xml(&map)?;
    
    let mut current_path = state.file_path.lock().unwrap();
    
    let target_path = if let Some(p) = path {
        *current_path = Some(p.clone());
        p
    } else if let Some(p) = &*current_path {
        p.clone()
    } else {
        return Err("No path specified and no current path defined".to_string());
    };
    
    std::fs::write(&target_path, content).map_err(|e| e.to_string())?;
    Ok(target_path)
}

#[tauri::command]
fn load_map(state: State<AppState>, path: String) -> Result<(), String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let new_map = from_xml(&content)?;
    
    let mut map = state.map.lock().unwrap();
    *map = new_map;
    map.compute_layout();
    
    let mut current_path = state.file_path.lock().unwrap();
    *current_path = Some(path);
    
    Ok(())
}

#[tauri::command]
fn add_icon(state: State<AppState>, node_id: String, icon: String) -> Result<(), String> {
    let mut map = state.map.lock().unwrap();
    map.add_icon(&node_id, icon)?;
    // Layout might change if icons affect width
    map.compute_layout();
    Ok(())
}

#[tauri::command]
fn remove_last_icon(state: State<AppState>, node_id: String) -> Result<(), String> {
    let mut map = state.map.lock().unwrap();
    map.remove_last_icon(&node_id)?;
    map.compute_layout();
    Ok(())
}

#[tauri::command]
fn save_xmind(state: State<AppState>, path: String) -> Result<String, String> {
    let map = state.map.lock().unwrap();
    let content = to_xmind(&map)?;
    
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    
    let mut current_path = state.file_path.lock().unwrap();
    *current_path = Some(path.clone());
    
    Ok(path)
}

#[tauri::command]
fn load_xmind(state: State<AppState>, path: String) -> Result<(), String> {
    let content = std::fs::read(&path).map_err(|e| e.to_string())?;
    let new_map = from_xmind(&content)?;
    
    let mut map = state.map.lock().unwrap();
    *map = new_map;
    map.compute_layout();
    
    let mut current_path = state.file_path.lock().unwrap();
    *current_path = Some(path);
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut map = MindMap::new();
    map.compute_layout();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState { 
            map: Mutex::new(map),
            file_path: Mutex::new(None) 
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
            remove_last_icon,
            save_xmind,
            load_xmind
        ])
        .setup(|app| {
             let handle = app.handle();
             use tauri::menu::{Menu, MenuItem, Submenu, PredefinedMenuItem};
             
             let file_menu = Submenu::with_items(
                 handle,
                 "File",
                 true,
                 &[
                     &MenuItem::with_id(handle, "new", "New", true, None::<&str>)?,
                     &MenuItem::with_id(handle, "open", "Open...", true, None::<&str>)?,
                     &PredefinedMenuItem::separator(handle)?,
                     &MenuItem::with_id(handle, "save", "Save", true, None::<&str>)?,
                     &MenuItem::with_id(handle, "save_as", "Save As...", true, None::<&str>)?,
                     &PredefinedMenuItem::separator(handle)?,
                     &MenuItem::with_id(handle, "exit", "Exit", true, None::<&str>)?,
                 ],
             )?;

             let edit_menu = Submenu::with_items(
                 handle,
                 "Edit",
                 true,
                 &[
                     &MenuItem::with_id(handle, "add_child", "Add Child (Tab)", true, None::<&str>)?,
                     &MenuItem::with_id(handle, "add_sibling", "Add Sibling (Enter)", true, None::<&str>)?,
                     &MenuItem::with_id(handle, "delete_node", "Delete Node (Del)", true, None::<&str>)?,
                     &MenuItem::with_id(handle, "rename_node", "Rename Node (F2)", true, None::<&str>)?,
                 ],
             )?;
             
             let help_menu = Submenu::with_items(
                 handle,
                 "Help",
                 true,
                 &[
                     &MenuItem::with_id(handle, "about", "About", true, None::<&str>)?,
                 ],
             )?;

             let menu = Menu::with_items(handle, &[&file_menu, &edit_menu, &help_menu])?;
             app.set_menu(menu)?;
             
             app.on_menu_event(move |app, event| {
                 match event.id().as_ref() {
                     "new" => { let _ = app.emit("menu-event", "new"); },
                     "open" => { let _ = app.emit("menu-event", "open"); },
                     "save" => { let _ = app.emit("menu-event", "save"); },
                     "save_as" => { let _ = app.emit("menu-event", "save_as"); },
                     "exit" => { let _ = app.emit("menu-event", "exit"); },
                     
                     "add_child" => { let _ = app.emit("menu-event", "add_child"); },
                     "add_sibling" => { let _ = app.emit("menu-event", "add_sibling"); },
                     "delete_node" => { let _ = app.emit("menu-event", "delete_node"); },
                     "rename_node" => { let _ = app.emit("menu-event", "rename_node"); },
                     
                     "about" => { let _ = app.emit("menu-event", "about"); },
                     _ => {}
                 }
             });
             
             Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
