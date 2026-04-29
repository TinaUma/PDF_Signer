use tauri::Manager;
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let sidecar = app.shell().sidecar("api-server").unwrap();
            let (_rx, _child) = sidecar.spawn().expect("Failed to start API sidecar");
            Ok(())
        })
        .on_window_event(|_window, event| {
            // Sidecar is auto-killed when all Tauri windows close
            if let tauri::WindowEvent::Destroyed = event {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
