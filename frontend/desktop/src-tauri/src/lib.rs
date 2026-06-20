// Thin Tauri shell. No business logic — that lives in @kora/shared.
// Plugins registered here expose OS APIs that platform.desktop.ts calls.

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running Kora desktop");
}
